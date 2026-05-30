ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS post boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS message boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS main_message text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS follow_message text NOT NULL DEFAULT '';