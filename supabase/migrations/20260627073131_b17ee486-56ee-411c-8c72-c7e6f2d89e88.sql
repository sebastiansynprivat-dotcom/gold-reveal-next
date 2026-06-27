
CREATE TABLE public.chatter_push_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trigger_key text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX chatter_push_log_user_trigger_time_idx
  ON public.chatter_push_log (user_id, trigger_key, sent_at DESC);

CREATE INDEX chatter_push_log_sent_at_idx
  ON public.chatter_push_log (sent_at DESC);

GRANT SELECT ON public.chatter_push_log TO authenticated;
GRANT ALL ON public.chatter_push_log TO service_role;

ALTER TABLE public.chatter_push_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read all push logs"
  ON public.chatter_push_log FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Chatters can read their own push logs"
  ON public.chatter_push_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
