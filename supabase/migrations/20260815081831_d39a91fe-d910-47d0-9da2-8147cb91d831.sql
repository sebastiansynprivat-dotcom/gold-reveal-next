-- Allow the same target for different accounts of the same user on one day
ALTER TABLE public.brezzels_comment_assignments
  DROP CONSTRAINT IF EXISTS brezzels_comment_assignments_user_id_target_id_assigned_dat_key;

CREATE UNIQUE INDEX IF NOT EXISTS brezzels_comment_assignments_user_acc_target_date_key
  ON public.brezzels_comment_assignments (user_id, account_id, target_id, assigned_date);

CREATE OR REPLACE FUNCTION public.get_brezzels_comment_targets_by_account(p_count integer DEFAULT 10)
 RETURNS TABLE(account_id uuid, account_label text, model_name text, target_id uuid, url text, completed boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'Europe/Berlin')::date;
  v_count integer := LEAST(GREATEST(COALESCE(p_count, 10), 1), 50);
  v_acc record;
  v_existing integer;
  v_needed integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext('brezzels-comment-user'),
    hashtext(v_user::text || '-' || v_today::text)
  );

  CREATE TEMP TABLE IF NOT EXISTS pg_temp.brezzels_eligible_accounts (
    id uuid PRIMARY KEY,
    created_at timestamptz NOT NULL
  ) ON COMMIT DROP;
  TRUNCATE pg_temp.brezzels_eligible_accounts;

  INSERT INTO pg_temp.brezzels_eligible_accounts (id, created_at)
  SELECT DISTINCT a.id, a.created_at
  FROM public.accounts a
  LEFT JOIN public.account_assignments aa
    ON aa.account_id = a.id
   AND aa.unassigned_at IS NULL
   AND aa.end_date IS NULL
  LEFT JOIN public.profiles p ON p.id = aa.profile_id
  WHERE lower(trim(a.platform)) = 'brezzels'
    AND (
      a.assigned_to = v_user
      OR aa.user_id = v_user
      OR p.user_id = v_user
    );

  UPDATE public.brezzels_comment_assignments bca
  SET account_id = (
    SELECT e.id
    FROM pg_temp.brezzels_eligible_accounts e
    ORDER BY e.created_at, e.id
    LIMIT 1
  )
  WHERE bca.user_id = v_user
    AND bca.assigned_date = v_today
    AND bca.account_id IS NULL
    AND EXISTS (SELECT 1 FROM pg_temp.brezzels_eligible_accounts);

  FOR v_acc IN
    SELECT e.id, e.created_at
    FROM pg_temp.brezzels_eligible_accounts e
    ORDER BY e.created_at, e.id
  LOOP
    SELECT count(*)
    INTO v_existing
    FROM public.brezzels_comment_assignments bca
    WHERE bca.user_id = v_user
      AND bca.assigned_date = v_today
      AND bca.account_id = v_acc.id;

    v_needed := GREATEST(0, v_count - v_existing);

    IF v_needed > 0 THEN
      INSERT INTO public.brezzels_comment_assignments
        (user_id, target_id, assigned_date, account_id)
      SELECT v_user, candidate.id, v_today, v_acc.id
      FROM (
        SELECT t.id
        FROM public.brezzels_comment_targets t
        LEFT JOIN LATERAL (
          SELECT count(*) AS assignment_count
          FROM public.brezzels_comment_assignments d
          WHERE d.target_id = t.id
            AND d.assigned_date = v_today
        ) today_usage ON true
        LEFT JOIN LATERAL (
          SELECT count(*) AS assignment_count
          FROM public.brezzels_comment_assignments w
          WHERE w.target_id = t.id
            AND w.assigned_date BETWEEN v_today - 6 AND v_today
        ) week_usage ON true
        LEFT JOIN LATERAL (
          SELECT count(*) AS times_seen, max(u.assigned_date) AS last_seen
          FROM public.brezzels_comment_assignments u
          WHERE u.user_id = v_user
            AND u.target_id = t.id
        ) user_usage ON true
        WHERE t.active = true
          -- only avoid duplicates inside the same account list; sharing across
          -- accounts and across chatters is allowed, balance is handled by ORDER BY
          AND NOT EXISTS (
            SELECT 1
            FROM public.brezzels_comment_assignments own_today
            WHERE own_today.user_id = v_user
              AND own_today.assigned_date = v_today
              AND own_today.account_id = v_acc.id
              AND own_today.target_id = t.id
          )
        ORDER BY
          COALESCE(today_usage.assignment_count, 0),
          COALESCE(week_usage.assignment_count, 0),
          COALESCE(user_usage.times_seen, 0),
          COALESCE(user_usage.last_seen, DATE '1970-01-01'),
          random()
        LIMIT v_needed
      ) candidate
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN QUERY
  SELECT a.id,
         COALESCE(NULLIF(a.username, ''), a.account_email)::text,
         COALESCE(NULLIF(m.username, ''), m.name)::text,
         t.id,
         t.url,
         bca.completed
  FROM public.brezzels_comment_assignments bca
  JOIN public.brezzels_comment_targets t ON t.id = bca.target_id
  JOIN public.accounts a ON a.id = bca.account_id
  LEFT JOIN public.models m ON m.id = a.model_id
  WHERE bca.user_id = v_user
    AND bca.assigned_date = v_today
    AND bca.account_id IN (SELECT e.id FROM pg_temp.brezzels_eligible_accounts e)
  ORDER BY a.created_at, bca.completed, bca.created_at;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_brezzels_comment_targets_by_account(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_brezzels_comment_targets_by_account(integer) TO authenticated, service_role;