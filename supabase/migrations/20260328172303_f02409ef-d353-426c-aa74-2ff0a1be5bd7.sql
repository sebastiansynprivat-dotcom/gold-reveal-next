
-- Fix privilege escalation: replace the ALL policy with explicit per-operation policies
-- This ensures non-super-admins cannot INSERT/UPDATE/DELETE roles

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Super admins can SELECT all roles
CREATE POLICY "Super admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));

-- Super admins can INSERT roles
CREATE POLICY "Super admins can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Super admins can UPDATE roles
CREATE POLICY "Super admins can update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Super admins can DELETE roles
CREATE POLICY "Super admins can delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));

-- Service role for edge functions (create-model-login, admin-manage)
CREATE POLICY "Service role full access user_roles"
  ON public.user_roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
