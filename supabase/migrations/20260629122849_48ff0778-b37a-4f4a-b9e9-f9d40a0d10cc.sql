CREATE OR REPLACE FUNCTION public.claim_pre_create_by_telegram(p_telegram_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_norm text := lower(regexp_replace(coalesce(p_telegram_id,''), '^@', ''));
  v_my_profile_id uuid;
  v_orphan record;
  v_moved int := 0;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;
  IF v_norm = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'empty');
  END IF;

  SELECT id INTO v_my_profile_id
  FROM public.profiles
  WHERE user_id = v_user
  LIMIT 1;

  -- Find an orphan pre_create profile with the same normalized telegram_id, no user_id.
  SELECT * INTO v_orphan
  FROM public.profiles
  WHERE user_id IS NULL
    AND telegram_id IS NOT NULL
    AND lower(regexp_replace(telegram_id, '^@', '')) = v_norm
  LIMIT 1;

  IF v_orphan.id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'merged', false);
  END IF;

  -- If the user has no profile yet, claim the existing pre-created profile directly.
  IF v_my_profile_id IS NULL THEN
    UPDATE public.profiles
       SET user_id = v_user,
           pre_create = false,
           updated_at = now()
     WHERE id = v_orphan.id;

    UPDATE public.account_assignments
       SET user_id = v_user
     WHERE profile_id = v_orphan.id;
    GET DIAGNOSTICS v_moved = ROW_COUNT;

    RETURN jsonb_build_object('ok', true, 'merged', true, 'claimed_existing_profile', true, 'assignments_moved', v_moved);
  END IF;

  -- Move assignments from the orphan profile to the real profile + user.
  UPDATE public.account_assignments
     SET profile_id = v_my_profile_id, user_id = v_user
   WHERE profile_id = v_orphan.id;
  GET DIAGNOSTICS v_moved = ROW_COUNT;

  -- Copy missing fields onto the real profile (do not overwrite existing values).
  UPDATE public.profiles p
     SET telegram_id = COALESCE(NULLIF(p.telegram_id,''), v_orphan.telegram_id),
         group_name  = COALESCE(NULLIF(p.group_name,''),  v_orphan.group_name),
         name        = COALESCE(NULLIF(p.name,''),        v_orphan.name),
         offer       = COALESCE(NULLIF(p.offer,''),       v_orphan.offer),
         start_date  = COALESCE(p.start_date,             v_orphan.start_date),
         updated_at  = now()
   WHERE p.id = v_my_profile_id;

  -- Free the unique telegram_id on the orphan, then delete it.
  UPDATE public.profiles SET telegram_id = NULL, updated_at = now() WHERE id = v_orphan.id;
  DELETE FROM public.profiles WHERE id = v_orphan.id;

  RETURN jsonb_build_object('ok', true, 'merged', true, 'assignments_moved', v_moved);
END;
$function$;