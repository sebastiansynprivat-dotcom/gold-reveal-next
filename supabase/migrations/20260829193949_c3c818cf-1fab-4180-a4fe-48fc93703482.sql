-- 1) Keep model_status in sync when only the active toggle is changed
CREATE OR REPLACE FUNCTION public.sync_model_status_from_active()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.model_active IS DISTINCT FROM OLD.model_active
     AND NEW.model_status IS NOT DISTINCT FROM OLD.model_status THEN
    IF NEW.model_active = false THEN
      NEW.model_status := 'inactive';
    ELSIF OLD.model_status = 'inactive' THEN
      NEW.model_status := 'active';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_model_status_from_active ON public.models;
CREATE TRIGGER trg_sync_model_status_from_active
BEFORE UPDATE OF model_active ON public.models
FOR EACH ROW EXECUTE FUNCTION public.sync_model_status_from_active();

-- 2) Propagate both fields to accounts
CREATE OR REPLACE FUNCTION public.sync_model_active_to_accounts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.model_active IS DISTINCT FROM OLD.model_active
     OR NEW.model_status IS DISTINCT FROM OLD.model_status THEN
    UPDATE public.accounts
    SET model_active = NEW.model_active,
        model_status = NEW.model_status
    WHERE model_id = NEW.id
      AND (model_active IS DISTINCT FROM NEW.model_active
           OR model_status IS DISTINCT FROM NEW.model_status);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_model_active_to_accounts ON public.models;
CREATE TRIGGER trg_sync_model_active_to_accounts
AFTER UPDATE OF model_active, model_status ON public.models
FOR EACH ROW EXECUTE FUNCTION public.sync_model_active_to_accounts();

-- 3) Backfill existing mismatches
UPDATE public.models
SET model_status = 'inactive'
WHERE model_active = false AND model_status <> 'inactive';

UPDATE public.models
SET model_status = 'active'
WHERE model_active = true AND model_status = 'inactive';

UPDATE public.accounts a
SET model_active = m.model_active,
    model_status = m.model_status
FROM public.models m
WHERE a.model_id = m.id
  AND (a.model_active IS DISTINCT FROM m.model_active
       OR a.model_status IS DISTINCT FROM m.model_status);