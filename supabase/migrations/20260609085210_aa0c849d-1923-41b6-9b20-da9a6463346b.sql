
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

-- Set start_date on new profile inserts (existing rows remain NULL)
CREATE OR REPLACE FUNCTION public.set_profile_start_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.start_date IS NULL THEN
    NEW.start_date := current_date;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_profile_start_date ON public.profiles;
CREATE TRIGGER trg_set_profile_start_date
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_profile_start_date();

-- Set end_date when profile is archived (on DELETE, before archive trigger captures the row)
CREATE OR REPLACE FUNCTION public.set_profile_end_date()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.end_date IS NULL THEN
    OLD.end_date := current_date;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_profile_end_date ON public.profiles;
-- Use a name that sorts before "archive_deleted_record" so end_date is set first
CREATE TRIGGER aa_set_profile_end_date
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_profile_end_date();
