
ALTER TABLE public.model_requests
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.model_request_messages
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Storage policies for request-media bucket.
-- Path convention: <user_id>/<request_id>/<filename>
CREATE POLICY "request-media: chatter upload own"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'request-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "request-media: chatter read own"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'request-media'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

CREATE POLICY "request-media: chatter delete own"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'request-media'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );
