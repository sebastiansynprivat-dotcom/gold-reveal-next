ALTER TABLE public.model_users
  ADD COLUMN IF NOT EXISTS email text DEFAULT '',
  ADD COLUMN IF NOT EXISTS plaintext_password text DEFAULT '';