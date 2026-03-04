
-- Admin can manage quiz_routes (INSERT, UPDATE, DELETE)
CREATE POLICY "Admin can manage quiz_routes"
ON public.quiz_routes
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());
