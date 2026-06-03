ALTER TABLE public.fanvue_instagram_snapshots
  ADD COLUMN IF NOT EXISTS instagram_url text;

CREATE INDEX IF NOT EXISTS fanvue_instagram_snapshots_model_url_idx
  ON public.fanvue_instagram_snapshots (model_id, instagram_url, recorded_at);