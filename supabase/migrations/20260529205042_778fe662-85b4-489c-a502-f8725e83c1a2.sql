CREATE OR REPLACE FUNCTION public.sync_model_active_to_accounts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.model_active IS DISTINCT FROM OLD.model_active THEN
    UPDATE public.accounts
    SET model_active = NEW.model_active
    WHERE model_id = NEW.id
      AND model_active IS DISTINCT FROM NEW.model_active;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_model_active_to_accounts ON public.models;
CREATE TRIGGER trg_sync_model_active_to_accounts
AFTER UPDATE OF model_active ON public.models
FOR EACH ROW
EXECUTE FUNCTION public.sync_model_active_to_accounts();

-- One-time sync of existing data
UPDATE public.accounts a
SET model_active = m.model_active
FROM public.models m
WHERE a.model_id = m.id
  AND a.model_active IS DISTINCT FROM m.model_active;