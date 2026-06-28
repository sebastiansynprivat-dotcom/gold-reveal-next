
-- RPC: claim orphan pre_create profile by telegram_id and merge into the caller's profile.
CREATE OR REPLACE FUNCTION public.claim_pre_create_by_telegram(p_telegram_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  SELECT id INTO v_my_profile_id FROM public.profiles WHERE user_id = v_user LIMIT 1;
  IF v_my_profile_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_profile');
  END IF;

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
         start_date  = COALESCE(p.start_date,             v_orphan.start_date)
   WHERE p.id = v_my_profile_id;

  -- Free the unique telegram_id on the orphan, then delete it.
  UPDATE public.profiles SET telegram_id = NULL WHERE id = v_orphan.id;
  DELETE FROM public.profiles WHERE id = v_orphan.id;

  RETURN jsonb_build_object('ok', true, 'merged', true, 'assignments_moved', v_moved);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_pre_create_by_telegram(text) TO authenticated;

-- One-off fix for Martha Hutterer:
-- Move her pre-create assignments & data into her real profile, then drop the orphan.
DO $$
DECLARE
  v_orphan_id uuid := 'f9b38965-ae43-4e72-8917-59a5738ada85';
  v_real_id   uuid := 'b328eaaa-cd94-41ac-993b-2940832552ac';
  v_user_id   uuid := 'ee128f4c-3012-4608-9e80-697a51cc081b';
BEGIN
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_orphan_id AND user_id IS NULL) THEN
    UPDATE public.account_assignments
       SET profile_id = v_real_id, user_id = v_user_id
     WHERE profile_id = v_orphan_id;

    UPDATE public.profiles
       SET telegram_id = COALESCE(NULLIF(telegram_id,''), '6527079682'),
           group_name  = 'Martha Hutterer',
           name        = COALESCE(NULLIF(name,''), 'Martha Hutterer')
     WHERE id = v_real_id;

    UPDATE public.profiles SET telegram_id = NULL WHERE id = v_orphan_id;
    DELETE FROM public.profiles WHERE id = v_orphan_id;
  END IF;
END $$;
