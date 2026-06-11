ALTER TABLE public.platforms
  ADD COLUMN IF NOT EXISTS auto_synced boolean NOT NULL DEFAULT true;

UPDATE public.model_profiles
   SET submitted_at = COALESCE(updated_at, created_at, now())
 WHERE submitted_at IS NULL
   AND (
        COALESCE(NULLIF(trim(name), ''), '') <> ''
     OR COALESCE(NULLIF(trim(coalesce(age::text,'')), ''), '') <> ''
     OR COALESCE(NULLIF(trim(city), ''), '') <> ''
     OR COALESCE(NULLIF(trim(occupation), ''), '') <> ''
     OR COALESCE(NULLIF(trim(hobbies), ''), '') <> ''
     OR COALESCE(NULLIF(trim(additional_info), ''), '') <> ''
   );