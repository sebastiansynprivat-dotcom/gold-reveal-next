-- Allow admin to update any profile
CREATE POLICY "Admin can update all profiles"
ON public.profiles
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());