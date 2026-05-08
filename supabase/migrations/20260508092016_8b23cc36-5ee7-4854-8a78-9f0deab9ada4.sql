ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS revenue_percentage_fourbased numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_percentage_maloum numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_percentage_brezzels numeric NOT NULL DEFAULT 0;