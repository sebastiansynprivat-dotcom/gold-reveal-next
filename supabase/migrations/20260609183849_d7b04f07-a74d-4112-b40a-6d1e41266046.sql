CREATE POLICY "Chatters can view assigned models"
ON public.models
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.model_id = models.id AND a.assigned_to = auth.uid()
  )
);