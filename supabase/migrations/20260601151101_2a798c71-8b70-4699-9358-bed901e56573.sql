-- AI Prompts: add English column + per-language "is_auto" flags
ALTER TABLE public.ai_prompts
  ADD COLUMN IF NOT EXISTS prompt_text_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS prompt_text_de_is_auto boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prompt_text_en_is_auto boolean NOT NULL DEFAULT true;

-- Notification templates: add English columns + per-language "is_auto" flags for title & body
ALTER TABLE public.notification_templates
  ADD COLUMN IF NOT EXISTS title_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS body_en  text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS title_de_is_auto boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS title_en_is_auto boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS body_de_is_auto  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS body_en_is_auto  boolean NOT NULL DEFAULT true;