DROP POLICY IF EXISTS "Chatters view own request messages" ON public.model_request_messages;

CREATE POLICY "Chatters view own request messages"
  ON public.model_request_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.model_requests r
      WHERE r.id = model_request_messages.request_id
        AND r.user_id = auth.uid()
    )
    AND (
      sender_role = 'admin'
      OR visible_to_chatter = true
      OR (sender_role = 'chatter' AND user_id = auth.uid())
    )
  );