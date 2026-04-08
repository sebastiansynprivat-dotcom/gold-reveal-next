ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS drive_folder_id text DEFAULT '',
  ADD COLUMN IF NOT EXISTS model_language text NOT NULL DEFAULT 'de',
  ADD COLUMN IF NOT EXISTS model_agency text NOT NULL DEFAULT 'shex',
  ADD COLUMN IF NOT EXISTS model_active boolean NOT NULL DEFAULT true;