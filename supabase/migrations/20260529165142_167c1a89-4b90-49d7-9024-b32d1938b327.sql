CREATE TABLE public.model_request_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.model_requests(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('admin','chatter')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mrm_request_id ON public.model_request_messages(request_id, created_at);

GRANT SELECT, INSERT ON public.model_request_messages TO authenticated;
GRANT ALL ON public.model_request_messages TO service_role;

ALTER TABLE public.model_request_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all request messages"
ON public.model_request_messages
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Chatters view own request messages"
ON public.model_request_messages
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.model_requests r WHERE r.id = request_id AND r.user_id = auth.uid()));

CREATE POLICY "Chatters insert own request messages"
ON public.model_request_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_role = 'chatter'
  AND user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.model_requests r WHERE r.id = request_id AND r.user_id = auth.uid())
);