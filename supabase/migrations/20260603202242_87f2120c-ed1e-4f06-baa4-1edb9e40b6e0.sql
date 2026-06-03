ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'fanvue_model';

CREATE TABLE public.fanvue_model_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  model_id uuid NOT NULL UNIQUE REFERENCES public.fanvue_models(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  plaintext_password text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.fanvue_model_users TO authenticated;
GRANT ALL ON public.fanvue_model_users TO service_role;

ALTER TABLE public.fanvue_model_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view fanvue model logins"
  ON public.fanvue_model_users FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins manage fanvue model logins"
  ON public.fanvue_model_users FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TRIGGER update_fanvue_model_users_updated_at
  BEFORE UPDATE ON public.fanvue_model_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();