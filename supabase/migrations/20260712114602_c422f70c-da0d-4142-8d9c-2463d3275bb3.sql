
CREATE OR REPLACE FUNCTION public.auto_reject_requests_on_model_inactive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reason text := 'Automatisch abgelehnt: Model wurde auf inaktiv gesetzt und nimmt aktuell keine Anfragen mehr an.';
BEGIN
  IF NEW.model_status = 'inactive'
     AND (TG_OP = 'INSERT' OR OLD.model_status IS DISTINCT FROM NEW.model_status) THEN
    UPDATE public.model_requests
       SET status = 'rejected',
           admin_comment = COALESCE(NULLIF(admin_comment, ''), v_reason)
     WHERE model_id = NEW.id
       AND status NOT IN ('rejected','archived','completed','done');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_reject_requests_on_model_inactive ON public.models;
CREATE TRIGGER trg_auto_reject_requests_on_model_inactive
AFTER INSERT OR UPDATE OF model_status ON public.models
FOR EACH ROW EXECUTE FUNCTION public.auto_reject_requests_on_model_inactive();

-- Retroactive one-off cleanup for currently inactive models
UPDATE public.model_requests r
   SET status = 'rejected',
       admin_comment = COALESCE(NULLIF(r.admin_comment, ''), 'Automatisch abgelehnt: Model wurde auf inaktiv gesetzt und nimmt aktuell keine Anfragen mehr an.')
  FROM public.models m
 WHERE r.model_id = m.id
   AND m.model_status = 'inactive'
   AND r.status NOT IN ('rejected','archived','completed','done');
