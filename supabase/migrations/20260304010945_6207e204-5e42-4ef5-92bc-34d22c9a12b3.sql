
CREATE POLICY "Admin can view all daily goals"
ON public.daily_goals
FOR SELECT
TO authenticated
USING (public.is_admin());
