ALTER TABLE public.accounts ALTER COLUMN media_id DROP DEFAULT;
ALTER TABLE public.accounts RENAME COLUMN media_id TO media;
ALTER TABLE public.accounts ALTER COLUMN media TYPE jsonb USING CASE WHEN media IS NULL THEN NULL ELSE to_jsonb(media) END;