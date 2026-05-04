
ALTER TABLE public.chatters
  ADD COLUMN IF NOT EXISTS provider_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS provider_is_business boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS provider_vat_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS provider_name_override text NOT NULL DEFAULT '';

ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS provider_address text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS provider_is_business boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS provider_vat_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS provider_name_override text NOT NULL DEFAULT '';
