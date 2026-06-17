
CREATE TABLE public.app_install_status (
  user_id uuid PRIMARY KEY,
  role text,
  pwa_installed_at timestamptz,
  push_enabled_at timestamptz,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_install_status TO authenticated;
GRANT ALL ON public.app_install_status TO service_role;

ALTER TABLE public.app_install_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own install status"
ON public.app_install_status
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all install status"
ON public.app_install_status
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE TRIGGER trg_app_install_status_updated_at
BEFORE UPDATE ON public.app_install_status
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
