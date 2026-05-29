
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  user_id uuid PRIMARY KEY,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.admin_profiles TO authenticated;
GRANT ALL ON public.admin_profiles TO service_role;

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read admin names"
ON public.admin_profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin can upsert own name"
ON public.admin_profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_super_admin());

CREATE POLICY "Admin can update own name"
ON public.admin_profiles FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR public.is_super_admin())
WITH CHECK (auth.uid() = user_id OR public.is_super_admin());

CREATE TRIGGER admin_profiles_updated_at
BEFORE UPDATE ON public.admin_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
