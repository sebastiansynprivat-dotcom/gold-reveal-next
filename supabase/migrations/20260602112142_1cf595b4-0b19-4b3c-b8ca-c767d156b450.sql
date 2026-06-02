
CREATE TABLE public.translation_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_lang text NOT NULL,
  target_lang text NOT NULL,
  source_text text NOT NULL,
  translated_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX translation_cache_unique_idx
  ON public.translation_cache (source_lang, target_lang, md5(source_text));

GRANT SELECT ON public.translation_cache TO anon, authenticated;
GRANT ALL ON public.translation_cache TO service_role;

ALTER TABLE public.translation_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read translation_cache"
ON public.translation_cache FOR SELECT
USING (true);

CREATE POLICY "Service role manages translation_cache"
ON public.translation_cache FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE TRIGGER update_translation_cache_updated_at
BEFORE UPDATE ON public.translation_cache
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
