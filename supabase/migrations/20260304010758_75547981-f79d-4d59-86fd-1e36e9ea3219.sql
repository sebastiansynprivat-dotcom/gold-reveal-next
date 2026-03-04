
CREATE POLICY "Admin can insert daily goals"
ON public.daily_goals
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update daily goals"
ON public.daily_goals
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());
