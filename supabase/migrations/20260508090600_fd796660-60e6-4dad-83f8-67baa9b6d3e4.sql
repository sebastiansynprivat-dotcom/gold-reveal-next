ALTER TABLE public.models ADD COLUMN IF NOT EXISTS referrer_tag text NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_models_referrer_tag ON public.models(referrer_tag) WHERE referrer_tag <> '';