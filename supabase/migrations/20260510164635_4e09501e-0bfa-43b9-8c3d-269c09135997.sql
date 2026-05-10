CREATE POLICY "Assigned chatters can view model profile"
ON public.model_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.assigned_to = auth.uid()
      AND a.model_id = model_profiles.model_id
  )
);