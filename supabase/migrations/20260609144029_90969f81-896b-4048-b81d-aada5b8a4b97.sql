
-- Drop FKs so archived ids stay intact on child rows
ALTER TABLE public.account_assignments DROP CONSTRAINT IF EXISTS account_assignments_account_id_fkey;
ALTER TABLE public.accounts_data DROP CONSTRAINT IF EXISTS accounts_data_account_id_fkey;
ALTER TABLE public.accounts_data DROP CONSTRAINT IF EXISTS accounts_data_model_id_fkey;

-- Trigger function: close open assignments for an account before it is archived
CREATE OR REPLACE FUNCTION public.pre_archive_account_close_assignments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.account_assignments
     SET end_date = COALESCE(end_date, current_date),
         unassigned_at = COALESCE(unassigned_at, now())
   WHERE account_id = OLD.id
     AND end_date IS NULL;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS a_pre_archive_account_close_assignments ON public.accounts;
CREATE TRIGGER a_pre_archive_account_close_assignments
BEFORE DELETE ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.pre_archive_account_close_assignments();

-- Trigger function: close open assignments for all child accounts before a model is archived
CREATE OR REPLACE FUNCTION public.pre_archive_model_close_assignments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.account_assignments aa
     SET end_date = COALESCE(aa.end_date, current_date),
         unassigned_at = COALESCE(aa.unassigned_at, now())
   WHERE aa.end_date IS NULL
     AND aa.account_id IN (SELECT id FROM public.accounts WHERE model_id = OLD.id);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS a_pre_archive_model_close_assignments ON public.models;
CREATE TRIGGER a_pre_archive_model_close_assignments
BEFORE DELETE ON public.models
FOR EACH ROW EXECUTE FUNCTION public.pre_archive_model_close_assignments();

-- Purge RPC for an archived account
CREATE OR REPLACE FUNCTION public.purge_archived_account(p_original_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can purge archived accounts';
  END IF;

  DELETE FROM public.account_assignments WHERE account_id = p_original_id;
  DELETE FROM public.accounts_data WHERE account_id = p_original_id;
END;
$$;

-- Purge RPC for an archived model (recurses into archived child accounts)
CREATE OR REPLACE FUNCTION public.purge_archived_model(p_original_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_child_id uuid;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can purge archived models';
  END IF;

  FOR v_child_id IN
    SELECT (data->>'id')::uuid
      FROM public.deleted_records
     WHERE entity_type = 'account'
       AND data->>'model_id' = p_original_id::text
  LOOP
    DELETE FROM public.account_assignments WHERE account_id = v_child_id;
    DELETE FROM public.accounts_data WHERE account_id = v_child_id;
    DELETE FROM public.deleted_records
     WHERE entity_type = 'account'
       AND original_id = v_child_id;
  END LOOP;

  DELETE FROM public.accounts_data WHERE model_id = p_original_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_archived_account(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_archived_model(uuid) TO authenticated;
