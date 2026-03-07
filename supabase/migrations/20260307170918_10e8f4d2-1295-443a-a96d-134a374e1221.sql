
-- Create model_dashboard table
CREATE TABLE public.model_dashboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid UNIQUE NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  fourbased_submitted boolean NOT NULL DEFAULT false,
  notes text DEFAULT '',
  revenue_percentage numeric DEFAULT 0,
  crypto_address text DEFAULT '',
  contract_file_path text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.model_dashboard ENABLE ROW LEVEL SECURITY;

-- Admin-only RLS policy
CREATE POLICY "Admin full access on model_dashboard"
  ON public.model_dashboard
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- updated_at trigger
CREATE TRIGGER update_model_dashboard_updated_at
  BEFORE UPDATE ON public.model_dashboard
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket for contracts
INSERT INTO storage.buckets (id, name, public)
VALUES ('model-contracts', 'model-contracts', false);

-- Storage RLS: admin upload
CREATE POLICY "Admin can upload contracts"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'model-contracts' AND is_admin());

-- Storage RLS: admin read
CREATE POLICY "Admin can read contracts"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'model-contracts' AND is_admin());

-- Storage RLS: admin delete
CREATE POLICY "Admin can delete contracts"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'model-contracts' AND is_admin());
