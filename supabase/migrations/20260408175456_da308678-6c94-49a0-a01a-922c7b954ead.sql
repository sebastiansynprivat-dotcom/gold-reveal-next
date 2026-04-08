
-- 1. Create the models table
CREATE TABLE public.models (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT '',
  username text DEFAULT '',
  address text DEFAULT '',
  revenue_percentage numeric NOT NULL DEFAULT 0,
  crypto_address text DEFAULT '',
  currency text NOT NULL DEFAULT 'EUR',
  contract_file_path text DEFAULT '',
  notes text DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;

-- Super admins full access
CREATE POLICY "Super admins can manage all models"
  ON public.models FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Sub admins can manage models they created
CREATE POLICY "Sub admins can manage own models"
  ON public.models FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'sub_admin'::app_role) AND created_by = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'sub_admin'::app_role) AND created_by = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_models_updated_at
  BEFORE UPDATE ON public.models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Add model_id to accounts
ALTER TABLE public.accounts ADD COLUMN model_id uuid REFERENCES public.models(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX idx_accounts_model_id ON public.accounts(model_id);
