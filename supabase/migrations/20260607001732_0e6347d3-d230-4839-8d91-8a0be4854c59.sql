-- When a model is deleted, also delete its associated accounts so they get archived
-- by the existing accounts archive trigger. Account-only deletes are unaffected.

CREATE OR REPLACE FUNCTION public.cascade_delete_model_accounts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deleting accounts here fires their own archive_deleted_record trigger,
  -- so each associated account is archived into deleted_records.
  DELETE FROM public.accounts WHERE model_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cascade_delete_model_accounts ON public.models;
CREATE TRIGGER trg_cascade_delete_model_accounts
BEFORE DELETE ON public.models
FOR EACH ROW EXECUTE FUNCTION public.cascade_delete_model_accounts();