
-- Archive table for deleted models, accounts, and profiles
CREATE TABLE public.deleted_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('model','account','profile')),
  original_id uuid NOT NULL,
  name text,
  email text,
  username text,
  platform text,
  model_agency text,
  telegram_id text,
  group_name text,
  deleted_by uuid,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  restored_at timestamptz,
  restored_by uuid,
  data jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_deleted_records_entity_type ON public.deleted_records(entity_type);
CREATE INDEX idx_deleted_records_original_id ON public.deleted_records(original_id);
CREATE INDEX idx_deleted_records_deleted_at ON public.deleted_records(deleted_at DESC);
CREATE INDEX idx_deleted_records_email ON public.deleted_records(email);
CREATE INDEX idx_deleted_records_data_gin ON public.deleted_records USING GIN(data);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deleted_records TO authenticated;
GRANT ALL ON public.deleted_records TO service_role;

ALTER TABLE public.deleted_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage deleted_records"
  ON public.deleted_records
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger function that archives on DELETE
CREATE OR REPLACE FUNCTION public.archive_deleted_record()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entity text;
  v_name text;
  v_email text;
  v_username text;
  v_platform text;
  v_agency text;
  v_telegram text;
  v_group text;
  v_row jsonb;
BEGIN
  v_row := to_jsonb(OLD);

  IF TG_TABLE_NAME = 'models' THEN
    v_entity := 'model';
    v_name := OLD.name;
    v_username := OLD.username;
    v_agency := OLD.model_agency;
  ELSIF TG_TABLE_NAME = 'accounts' THEN
    v_entity := 'account';
    v_email := OLD.account_email;
    v_platform := OLD.platform;
    v_agency := OLD.model_agency;
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    v_entity := 'profile';
    v_email := OLD.account_email;
    v_telegram := OLD.telegram_id;
    v_group := OLD.group_name;
  END IF;

  INSERT INTO public.deleted_records (
    entity_type, original_id, name, email, username, platform,
    model_agency, telegram_id, group_name, deleted_by, data
  ) VALUES (
    v_entity, OLD.id, v_name, v_email, v_username, v_platform,
    v_agency, v_telegram, v_group, auth.uid(), v_row
  );

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_archive_models_delete
  BEFORE DELETE ON public.models
  FOR EACH ROW EXECUTE FUNCTION public.archive_deleted_record();

CREATE TRIGGER trg_archive_accounts_delete
  BEFORE DELETE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.archive_deleted_record();

CREATE TRIGGER trg_archive_profiles_delete
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.archive_deleted_record();
