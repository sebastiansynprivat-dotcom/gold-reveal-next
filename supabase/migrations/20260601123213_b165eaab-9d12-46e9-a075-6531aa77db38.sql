ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS commission_override_fourbased numeric,
  ADD COLUMN IF NOT EXISTS commission_override_maloum numeric,
  ADD COLUMN IF NOT EXISTS commission_override_brezzels numeric;