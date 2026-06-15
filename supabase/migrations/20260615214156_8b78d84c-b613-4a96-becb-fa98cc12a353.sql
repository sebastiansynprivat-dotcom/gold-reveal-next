CREATE POLICY "Models read own fanvue_model_users row"
ON public.fanvue_model_users
FOR SELECT
TO authenticated
USING (user_id = auth.uid());