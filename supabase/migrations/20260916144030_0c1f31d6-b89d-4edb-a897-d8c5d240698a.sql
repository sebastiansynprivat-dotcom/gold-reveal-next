ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();

CREATE OR REPLACE FUNCTION public.normalize_telegram_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.telegram_id IS NOT NULL THEN
    NEW.telegram_id := NULLIF(regexp_replace(NEW.telegram_id, '(\s|^@)', '', 'g'), '');
    IF NEW.telegram_id IS NOT NULL AND NEW.telegram_id !~ '^[0-9]+$' THEN
      RAISE EXCEPTION 'Ungültige Telegram-ID "%": Telegram-IDs bestehen ausschließlich aus Ziffern.', NEW.telegram_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_telegram_id ON public.profiles;
CREATE TRIGGER trg_normalize_telegram_id
BEFORE INSERT OR UPDATE OF telegram_id ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.normalize_telegram_id();