
-- Models need to read account_assignments for their account to load revenue
CREATE POLICY "Models can view assignments for own account" ON public.account_assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.model_users mu
      WHERE mu.account_id = account_assignments.account_id AND mu.user_id = auth.uid()
    )
  );
