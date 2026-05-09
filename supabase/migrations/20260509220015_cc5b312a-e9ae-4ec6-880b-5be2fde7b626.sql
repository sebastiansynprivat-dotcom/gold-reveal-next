ALTER TABLE public.chatters
  ADD COLUMN IF NOT EXISTS custom_platform_name text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS custom_revenue numeric NOT NULL DEFAULT 0;