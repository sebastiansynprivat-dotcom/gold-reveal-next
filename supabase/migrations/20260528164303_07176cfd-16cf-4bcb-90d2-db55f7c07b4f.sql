CREATE TABLE public.model_biographies (
  model_id uuid PRIMARY KEY,
  drive_file_id text,
  file_name text,
  html text,
  modified_time timestamptz,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.model_biographies TO authenticated;
GRANT ALL ON public.model_biographies TO service_role;

ALTER TABLE public.model_biographies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all biographies"
  ON public.model_biographies
  FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Assigned chatters can view biography"
  ON public.model_biographies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.assigned_to = auth.uid()
        AND a.model_id = model_biographies.model_id
    )
  );

CREATE POLICY "Models can view own biography"
  ON public.model_biographies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.model_users mu
      WHERE mu.user_id = auth.uid()
        AND mu.model_id = model_biographies.model_id
    )
  );