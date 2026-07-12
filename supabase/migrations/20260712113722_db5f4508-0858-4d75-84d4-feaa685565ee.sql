ALTER TABLE public.models ADD COLUMN IF NOT EXISTS model_status text NOT NULL DEFAULT 'active' CHECK (model_status IN ('active','semi','inactive'));
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS model_status text NOT NULL DEFAULT 'active' CHECK (model_status IN ('active','semi','inactive'));

-- Backfill from existing boolean
UPDATE public.models SET model_status = CASE WHEN model_active = false THEN 'inactive' ELSE 'active' END WHERE model_status = 'active';
UPDATE public.accounts SET model_status = CASE WHEN model_active = false THEN 'inactive' ELSE 'active' END WHERE model_status = 'active';