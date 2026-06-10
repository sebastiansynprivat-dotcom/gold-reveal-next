ALTER TABLE public.model_profiles
  ADD COLUMN IF NOT EXISTS approved_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS last_change_at timestamptz;