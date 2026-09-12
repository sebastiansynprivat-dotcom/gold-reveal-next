CREATE POLICY "Admins read payout statements"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payout-statements' AND public.is_admin());