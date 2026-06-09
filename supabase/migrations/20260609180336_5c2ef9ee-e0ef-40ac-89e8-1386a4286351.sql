CREATE OR REPLACE FUNCTION public.claim_pre_chatter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_norm text;
  v_pre_profile_id uuid;
  v_aa RECORD;
BEGIN
  IF NEW.pre_create = true THEN
    RETURN NEW;
  END IF;

  IF NEW.telegram_id IS NULL OR NEW.telegram_id = '' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND COALESCE(OLD.telegram_id, '') = COALESCE(NEW.telegram_id, '') THEN
    RETURN NEW;
  END IF;

  v_norm := lower(regexp_replace(NEW.telegram_id, '^@', ''));

  SELECT id INTO v_pre_profile_id
    FROM public.profiles
   WHERE pre_create = true
     AND id <> NEW.id
     AND lower(regexp_replace(telegram_id, '^@', '')) = v_norm
   LIMIT 1;

  IF v_pre_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.profiles src
     SET pre_create = false
   WHERE id = v_pre_profile_id;

  SELECT * INTO v_aa FROM public.profiles WHERE id = v_pre_profile_id;
  IF (NEW.group_name IS NULL OR NEW.group_name = '') AND v_aa.name IS NOT NULL AND v_aa.name <> '' THEN
    NEW.group_name := v_aa.name;
  END IF;
  IF v_aa.language IS NOT NULL THEN
    NEW.language := v_aa.language;
    NEW.ui_language := v_aa.language;
  END IF;

  FOR v_aa IN
    SELECT * FROM public.account_assignments
     WHERE profile_id = v_pre_profile_id AND end_date IS NULL
  LOOP
    UPDATE public.account_assignments
       SET user_id = NEW.user_id, profile_id = NEW.id
     WHERE id = v_aa.id;

    UPDATE public.accounts
       SET assigned_to = NEW.user_id, assigned_at = COALESCE(assigned_at, now())
     WHERE id = v_aa.account_id AND assigned_to IS NULL;
  END LOOP;

  DELETE FROM public.profiles WHERE id = v_pre_profile_id;

  RETURN NEW;
END
$function$;