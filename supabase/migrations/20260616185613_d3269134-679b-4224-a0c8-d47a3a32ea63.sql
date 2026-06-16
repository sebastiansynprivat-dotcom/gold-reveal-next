CREATE POLICY "Model users can view their own model"
ON public.models
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.model_users mu
    WHERE mu.user_id = auth.uid()
      AND (mu.model_id = models.id
           OR EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = mu.account_id AND a.model_id = models.id))
  )
);