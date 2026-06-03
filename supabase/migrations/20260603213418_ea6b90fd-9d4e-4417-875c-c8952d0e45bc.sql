ALTER TABLE public.fanvue_models
  ADD COLUMN IF NOT EXISTS platform_logins jsonb NOT NULL DEFAULT '[]'::jsonb;