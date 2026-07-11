CREATE POLICY "Chatters view followups on their own requests"
ON public.model_request_followups
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.model_requests r
    WHERE r.id = model_request_followups.request_id
      AND r.user_id = auth.uid()
  )
);