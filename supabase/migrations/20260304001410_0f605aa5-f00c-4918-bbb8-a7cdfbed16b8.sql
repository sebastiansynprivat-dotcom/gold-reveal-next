-- Allow admin to delete profiles
CREATE POLICY "Admin can delete profiles"
ON public.profiles
FOR DELETE
USING (is_admin());

-- Allow admin to delete user_progress
CREATE POLICY "Admin can delete user progress"
ON public.user_progress
FOR DELETE
USING (is_admin());

-- Allow admin to delete push_subscriptions
CREATE POLICY "Admin can delete push subscriptions"
ON public.push_subscriptions
FOR DELETE
USING (is_admin());

-- Allow admin to update accounts (to unassign)
CREATE POLICY "Admin can update accounts"
ON public.accounts
FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());