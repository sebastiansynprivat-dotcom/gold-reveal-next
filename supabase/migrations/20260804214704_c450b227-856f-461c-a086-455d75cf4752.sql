CREATE OR REPLACE FUNCTION public.chatter_can_access_request_model(_user_id uuid, _model_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _model_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.assigned_to = _user_id
      AND a.model_id = _model_id
  )
$$;

GRANT EXECUTE ON FUNCTION public.chatter_can_access_request_model(uuid, uuid) TO authenticated;

CREATE POLICY "Chatters view requests of assigned models"
ON public.model_requests
FOR SELECT
TO authenticated
USING (public.chatter_can_access_request_model(auth.uid(), model_id));

CREATE POLICY "Chatters view messages of assigned model requests"
ON public.model_request_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.model_requests r
    WHERE r.id = model_request_messages.request_id
      AND public.chatter_can_access_request_model(auth.uid(), r.model_id)
  )
  AND (sender_role = 'admin' OR visible_to_chatter = true OR (sender_role = 'chatter' AND user_id = auth.uid()))
);

CREATE POLICY "Chatters insert messages on assigned model requests"
ON public.model_request_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_role = 'chatter'
  AND user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.model_requests r
    WHERE r.id = model_request_messages.request_id
      AND public.chatter_can_access_request_model(auth.uid(), r.model_id)
  )
);

CREATE POLICY "Chatters view followups of assigned model requests"
ON public.model_request_followups
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.model_requests r
    WHERE r.id = model_request_followups.request_id
      AND public.chatter_can_access_request_model(auth.uid(), r.model_id)
  )
);