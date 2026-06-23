CREATE TABLE public.automated_reminder_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reminder_type text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX automated_reminder_log_user_type_idx
  ON public.automated_reminder_log (user_id, reminder_type, sent_at DESC);
GRANT SELECT ON public.automated_reminder_log TO authenticated;
GRANT ALL ON public.automated_reminder_log TO service_role;
ALTER TABLE public.automated_reminder_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own reminder log" ON public.automated_reminder_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all reminder log" ON public.automated_reminder_log
  FOR SELECT TO authenticated USING (public.is_admin());