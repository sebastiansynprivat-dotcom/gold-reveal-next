CREATE TABLE public.account_offboardings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  model_id uuid,
  platform text,
  target_date date NOT NULL,
  status text NOT NULL DEFAULT 'scheduled',
  archived_at timestamptz,
  last_run_at timestamptz,
  last_error text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX account_offboardings_open_unique
  ON public.account_offboardings (account_id)
  WHERE status <> 'done';

CREATE INDEX account_offboardings_model_idx ON public.account_offboardings (model_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_offboardings TO authenticated;
GRANT ALL ON public.account_offboardings TO service_role;

ALTER TABLE public.account_offboardings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage offboardings"
  ON public.account_offboardings FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER trg_account_offboardings_updated_at
  BEFORE UPDATE ON public.account_offboardings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.offboarding_statement_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offboarding_id uuid REFERENCES public.account_offboardings(id) ON DELETE SET NULL,
  account_id uuid NOT NULL,
  platform text,
  period text NOT NULL,
  storage_path text NOT NULL,
  amount numeric,
  currency text,
  pending boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX offboarding_statement_files_account_period_key
  ON public.offboarding_statement_files (account_id, period);

GRANT SELECT ON public.offboarding_statement_files TO authenticated;
GRANT ALL ON public.offboarding_statement_files TO service_role;

ALTER TABLE public.offboarding_statement_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read statement files"
  ON public.offboarding_statement_files FOR SELECT TO authenticated
  USING (public.is_admin());