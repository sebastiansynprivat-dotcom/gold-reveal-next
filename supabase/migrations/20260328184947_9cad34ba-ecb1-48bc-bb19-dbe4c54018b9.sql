DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin can delete profiles" ON public.profiles;

CREATE POLICY "Super admins can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Sub admins can view assigned profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.accounts a
    WHERE a.assigned_to = profiles.user_id
      AND public.can_access_account(auth.uid(), a.id)
  )
);

CREATE POLICY "Sub admins can update assigned profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.accounts a
    WHERE a.assigned_to = profiles.user_id
      AND public.can_access_account(auth.uid(), a.id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.accounts a
    WHERE a.assigned_to = profiles.user_id
      AND public.can_access_account(auth.uid(), a.id)
  )
);

DROP POLICY IF EXISTS "Admin full access on accounts" ON public.accounts;
DROP POLICY IF EXISTS "Admin can update accounts" ON public.accounts;
DROP POLICY IF EXISTS "Admin can delete accounts" ON public.accounts;
DROP POLICY IF EXISTS "Sub admins can view assigned accounts" ON public.accounts;

CREATE POLICY "Super admins can manage all accounts"
ON public.accounts
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Sub admins can view assigned accounts"
ON public.accounts
FOR SELECT
TO authenticated
USING (public.can_access_account(auth.uid(), id));

CREATE POLICY "Sub admins can update assigned accounts"
ON public.accounts
FOR UPDATE
TO authenticated
USING (public.can_access_account(auth.uid(), id))
WITH CHECK (public.can_access_account(auth.uid(), id));

DROP POLICY IF EXISTS "Admin full access on account_assignments" ON public.account_assignments;

CREATE POLICY "Super admins can manage all account_assignments"
ON public.account_assignments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Sub admins can view assigned account_assignments" ON public.account_assignments;

CREATE POLICY "Sub admins can view assigned account_assignments"
ON public.account_assignments
FOR SELECT
TO authenticated
USING (public.can_access_account(auth.uid(), account_id));