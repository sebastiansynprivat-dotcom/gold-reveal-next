ALTER TABLE public.fanvue_models
  ADD COLUMN IF NOT EXISTS telegram_reels_url text,
  ADD COLUMN IF NOT EXISTS telegram_backgrounds_url text,
  ADD COLUMN IF NOT EXISTS telegram_feed_url text;