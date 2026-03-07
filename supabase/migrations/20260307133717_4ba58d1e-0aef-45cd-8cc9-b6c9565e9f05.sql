ALTER TABLE public.model_requests ADD COLUMN model_language text NOT NULL DEFAULT 'de';
ALTER TABLE public.accounts ADD COLUMN model_language text NOT NULL DEFAULT 'de';