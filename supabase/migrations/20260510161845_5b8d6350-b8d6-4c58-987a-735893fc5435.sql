DROP POLICY IF EXISTS "Model can view own profile" ON public.model_profiles;
DROP POLICY IF EXISTS "Model can insert own profile" ON public.model_profiles;
DROP POLICY IF EXISTS "Model can update own profile" ON public.model_profiles;

CREATE POLICY "Model or admin can view profile"
ON public.model_profiles FOR SELECT
USING (
  public.is_admin()
  OR EXISTS (SELECT 1 FROM public.model_users mu WHERE mu.user_id = auth.uid() AND mu.model_id = model_profiles.model_id)
);

CREATE POLICY "Model or admin can insert profile"
ON public.model_profiles FOR INSERT
WITH CHECK (
  public.is_admin()
  OR EXISTS (SELECT 1 FROM public.model_users mu WHERE mu.user_id = auth.uid() AND mu.model_id = model_profiles.model_id)
);

CREATE POLICY "Model or admin can update profile"
ON public.model_profiles FOR UPDATE
USING (
  public.is_admin()
  OR EXISTS (SELECT 1 FROM public.model_users mu WHERE mu.user_id = auth.uid() AND mu.model_id = model_profiles.model_id)
);