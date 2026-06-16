ALTER TABLE public.model_profiles
  ADD COLUMN IF NOT EXISTS content_audios_for_chat BOOLEAN,
  ADD COLUMN IF NOT EXISTS content_video_speaking BOOLEAN,
  ADD COLUMN IF NOT EXISTS content_dick_ratings BOOLEAN,
  ADD COLUMN IF NOT EXISTS content_joi BOOLEAN;