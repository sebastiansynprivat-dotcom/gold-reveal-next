
CREATE POLICY "Fanvue models can view their own model"
  ON public.fanvue_models FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'fanvue_model'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.fanvue_model_users mu
      WHERE mu.model_id = fanvue_models.id AND mu.user_id = auth.uid()
    )
  );

CREATE POLICY "Fanvue models can view their own follower snapshots"
  ON public.fanvue_instagram_snapshots FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'fanvue_model'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.fanvue_model_users mu
      WHERE mu.model_id = fanvue_instagram_snapshots.model_id AND mu.user_id = auth.uid()
    )
  );

CREATE POLICY "Fanvue models can view their own post snapshots"
  ON public.fanvue_instagram_post_snapshots FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'fanvue_model'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.fanvue_model_users mu
      WHERE mu.model_id = fanvue_instagram_post_snapshots.model_id AND mu.user_id = auth.uid()
    )
  );
