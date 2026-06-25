DROP POLICY IF EXISTS "Assigned chatters can view model profile" ON public.model_profiles;
CREATE POLICY "Assigned chatters can view model profile"
ON public.model_profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.model_id = model_profiles.model_id
      AND a.assigned_to = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.account_assignments aa
    JOIN public.accounts a ON a.id = aa.account_id
    WHERE a.model_id = model_profiles.model_id
      AND aa.end_date IS NULL
      AND (
        aa.user_id = auth.uid()
        OR aa.profile_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
      )
  )
);