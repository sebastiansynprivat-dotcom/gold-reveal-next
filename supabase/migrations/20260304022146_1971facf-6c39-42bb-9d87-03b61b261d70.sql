
CREATE TABLE public.login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  logged_in_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logins" ON public.login_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logins" ON public.login_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin full access on login_events" ON public.login_events FOR ALL USING (is_admin()) WITH CHECK (is_admin());
