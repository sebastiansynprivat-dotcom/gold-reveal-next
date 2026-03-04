-- Allow admin to delete daily_goals
CREATE POLICY "Admin can delete daily goals"
ON public.daily_goals
FOR DELETE
USING (is_admin());