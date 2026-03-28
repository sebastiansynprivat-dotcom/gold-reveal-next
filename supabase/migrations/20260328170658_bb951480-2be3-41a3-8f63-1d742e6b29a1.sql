
-- 2. Create admin_account_access table
CREATE TABLE public.admin_account_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(admin_user_id, account_id)
);

-- Enable RLS
ALTER TABLE public.admin_account_access ENABLE ROW LEVEL SECURITY;

-- Only super_admins can manage access assignments
CREATE POLICY "Super admins can manage account access"
  ON public.admin_account_access FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Sub-admins can view their own access entries
CREATE POLICY "Sub admins can view own access"
  ON public.admin_account_access FOR SELECT
  TO authenticated
  USING (admin_user_id = auth.uid());

-- 3. Create can_access_account function
CREATE OR REPLACE FUNCTION public.can_access_account(p_user_id UUID, p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    has_role(p_user_id, 'super_admin')
    OR EXISTS (
      SELECT 1 FROM admin_account_access
      WHERE admin_user_id = p_user_id AND account_id = p_account_id
    )
$$;

-- 4. Update is_admin() to recognize super_admin and sub_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin', 'sub_admin')
  )
$$;

-- 5. Helper: is_super_admin()
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('admin', 'super_admin')
  )
$$;

-- 6. Migrate existing admin roles to super_admin
UPDATE public.user_roles SET role = 'super_admin' WHERE role = 'admin';

-- 7. Update accounts RLS: add sub_admin access policy
CREATE POLICY "Sub admins can view assigned accounts"
  ON public.accounts FOR SELECT
  TO authenticated
  USING (can_access_account(auth.uid(), id));

-- 8. Update account_assignments RLS for sub_admins
CREATE POLICY "Sub admins can view assigned account_assignments"
  ON public.account_assignments FOR SELECT
  TO authenticated
  USING (can_access_account(auth.uid(), account_id));

-- 9. Update admin_totp_secrets policies to use new role check
DROP POLICY IF EXISTS "Admins can manage totp secrets" ON public.admin_totp_secrets;
CREATE POLICY "Admins can manage totp secrets"
  ON public.admin_totp_secrets FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'sub_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'sub_admin'));

-- 10. Update user_roles management policy for super_admin
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));
