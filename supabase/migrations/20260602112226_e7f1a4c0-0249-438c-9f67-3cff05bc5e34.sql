
DROP INDEX IF EXISTS public.translation_cache_unique_idx;

ALTER TABLE public.translation_cache
  ADD CONSTRAINT translation_cache_unique
  UNIQUE (source_lang, target_lang, source_text);
