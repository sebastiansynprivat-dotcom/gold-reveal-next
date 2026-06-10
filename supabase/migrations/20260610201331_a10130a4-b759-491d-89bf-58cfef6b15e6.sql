
-- 1) Extend model_requests for forwarding to model
ALTER TABLE public.model_requests
  ADD COLUMN IF NOT EXISTS model_id uuid REFERENCES public.models(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS forwarded_to_model_at timestamptz,
  ADD COLUMN IF NOT EXISTS model_status text,
  ADD COLUMN IF NOT EXISTS model_completed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_model_requests_model_id ON public.model_requests(model_id) WHERE model_id IS NOT NULL;

-- Helper: resolve auth user -> model_id via model_users
CREATE OR REPLACE FUNCTION public.current_model_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT model_id FROM public.model_users WHERE user_id = auth.uid() LIMIT 1;
$$;

-- RLS: models can SELECT/UPDATE requests forwarded to them
DROP POLICY IF EXISTS "Models can view forwarded requests" ON public.model_requests;
CREATE POLICY "Models can view forwarded requests"
  ON public.model_requests FOR SELECT
  TO authenticated
  USING (model_id IS NOT NULL AND model_id = public.current_model_id());

DROP POLICY IF EXISTS "Models can update forwarded requests" ON public.model_requests;
CREATE POLICY "Models can update forwarded requests"
  ON public.model_requests FOR UPDATE
  TO authenticated
  USING (model_id IS NOT NULL AND model_id = public.current_model_id())
  WITH CHECK (model_id IS NOT NULL AND model_id = public.current_model_id());

-- 2) Extend model_request_messages: allow sender_role='model', gate visibility to chatter
ALTER TABLE public.model_request_messages
  DROP CONSTRAINT IF EXISTS model_request_messages_sender_role_check;
ALTER TABLE public.model_request_messages
  ADD CONSTRAINT model_request_messages_sender_role_check
  CHECK (sender_role IN ('admin','chatter','model'));

ALTER TABLE public.model_request_messages
  ADD COLUMN IF NOT EXISTS visible_to_chatter boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_by_admin_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by_admin uuid;

-- Admin-authored messages are immediately visible to the chatter
UPDATE public.model_request_messages
   SET visible_to_chatter = true
 WHERE sender_role = 'admin' AND visible_to_chatter = false;

-- Replace chatter SELECT policy to hide unapproved model messages
DROP POLICY IF EXISTS "Chatters view own request messages" ON public.model_request_messages;
CREATE POLICY "Chatters view own request messages"
  ON public.model_request_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.model_requests r
      WHERE r.id = model_request_messages.request_id
        AND r.user_id = auth.uid()
    )
    AND (sender_role = 'admin' OR visible_to_chatter = true)
  );

-- Models can read messages on their forwarded requests
DROP POLICY IF EXISTS "Models view own request messages" ON public.model_request_messages;
CREATE POLICY "Models view own request messages"
  ON public.model_request_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.model_requests r
      WHERE r.id = model_request_messages.request_id
        AND r.model_id IS NOT NULL
        AND r.model_id = public.current_model_id()
    )
  );

-- Models can insert their own (model-role) messages, never visible directly to chatter
DROP POLICY IF EXISTS "Models insert own request messages" ON public.model_request_messages;
CREATE POLICY "Models insert own request messages"
  ON public.model_request_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_role = 'model'
    AND user_id = auth.uid()
    AND visible_to_chatter = false
    AND EXISTS (
      SELECT 1 FROM public.model_requests r
      WHERE r.id = model_request_messages.request_id
        AND r.model_id IS NOT NULL
        AND r.model_id = public.current_model_id()
    )
  );
