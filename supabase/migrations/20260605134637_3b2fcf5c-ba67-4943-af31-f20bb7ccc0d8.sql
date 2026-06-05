CREATE POLICY "Authenticated can view issuer_settings"
ON public.issuer_settings FOR SELECT
TO authenticated
USING (true);