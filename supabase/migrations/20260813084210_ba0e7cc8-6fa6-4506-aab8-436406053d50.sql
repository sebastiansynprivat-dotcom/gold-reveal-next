CREATE OR REPLACE FUNCTION public.get_brezzels_comment_targets_by_account(p_count integer DEFAULT 10)
RETURNS TABLE(account_id uuid, account_label text, model_name text, target_id uuid, url text, completed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_today date := (now() AT TIME ZONE 'Europe/Berlin')::date;
  v_acc record;
  v_first_acc uuid;
  v_existing integer;
  v_needed integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('brezzels-comment-distribution-' || v_today::text));

  SELECT eligible.id
    INTO v_first_acc
    FROM (
      SELECT DISTINCT ON (a.id) a.id, a.created_at
        FROM public.accounts a
        LEFT JOIN public.account_assignments aa
          ON aa.account_id = a.id
         AND aa.end_date IS NULL
        LEFT JOIN public.profiles p
          ON p.id = aa.profile_id
       WHERE lower(trim(a.platform)) = 'brezzels'
         AND (
           a.assigned_to = v_user
           OR aa.user_id = v_user
           OR p.user_id = v_user
         )
       ORDER BY a.id, a.created_at ASC
    ) eligible
   ORDER BY eligible.created_at ASC
   LIMIT 1;

  IF v_first_acc IS NOT NULL THEN
    UPDATE public.brezzels_comment_assignments
       SET account_id = v_first_acc
     WHERE user_id = v_user
       AND assigned_date = v_today
       AND account_id IS NULL;
  END IF;

  FOR v_acc IN
    SELECT eligible.id, eligible.created_at
      FROM (
        SELECT DISTINCT ON (a.id) a.id, a.created_at
          FROM public.accounts a
          LEFT JOIN public.account_assignments aa
            ON aa.account_id = a.id
           AND aa.end_date IS NULL
          LEFT JOIN public.profiles p
            ON p.id = aa.profile_id
         WHERE lower(trim(a.platform)) = 'brezzels'
           AND (
             a.assigned_to = v_user
             OR aa.user_id = v_user
             OR p.user_id = v_user
           )
         ORDER BY a.id, a.created_at ASC
      ) eligible
     ORDER BY eligible.created_at ASC
  LOOP
    SELECT count(*)
      INTO v_existing
      FROM public.brezzels_comment_assignments bca
     WHERE bca.user_id = v_user
       AND bca.assigned_date = v_today
       AND bca.account_id = v_acc.id;

    v_needed := GREATEST(0, p_count - v_existing);

    IF v_needed > 0 THEN
      INSERT INTO public.brezzels_comment_assignments
        (user_id, target_id, assigned_date, account_id)
      SELECT v_user, ranked.id, v_today, v_acc.id
        FROM (
          SELECT t.id,
                 row_number() OVER (
                   ORDER BY
                     COALESCE(today_usage.assignment_count, 0) ASC,
                     COALESCE(week_usage.assignment_count, 0) ASC,
                     COALESCE(user_usage.times_seen, 0) ASC,
                     COALESCE(user_usage.last_seen, DATE '1970-01-01') ASC,
                     random()
                 ) AS position
            FROM public.brezzels_comment_targets t
            LEFT JOIN (
              SELECT bca_today.target_id, count(*) AS assignment_count
                FROM public.brezzels_comment_assignments bca_today
               WHERE bca_today.assigned_date = v_today
               GROUP BY bca_today.target_id
            ) today_usage ON today_usage.target_id = t.id
            LEFT JOIN (
              SELECT bca_week.target_id, count(*) AS assignment_count
                FROM public.brezzels_comment_assignments bca_week
               WHERE bca_week.assigned_date BETWEEN v_today - 6 AND v_today
               GROUP BY bca_week.target_id
            ) week_usage ON week_usage.target_id = t.id
            LEFT JOIN (
              SELECT bca_user.target_id,
                     count(*) AS times_seen,
                     max(bca_user.assigned_date) AS last_seen
                FROM public.brezzels_comment_assignments bca_user
               WHERE bca_user.user_id = v_user
               GROUP BY bca_user.target_id
            ) user_usage ON user_usage.target_id = t.id
           WHERE t.active = true
             AND NOT EXISTS (
               SELECT 1
                 FROM public.brezzels_comment_assignments own_today
                WHERE own_today.user_id = v_user
                  AND own_today.assigned_date = v_today
                  AND own_today.target_id = t.id
             )
        ) ranked
       WHERE ranked.position <= v_needed
      ON CONFLICT ON CONSTRAINT brezzels_comment_assignments_user_id_target_id_assigned_dat_key DO NOTHING;
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
     AND bca.account_id IS NOT NULL
   ORDER BY a.created_at ASC, bca.completed ASC, bca.created_at ASC;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_brezzels_comment_targets_by_account(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_brezzels_comment_targets_by_account(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_brezzels_comment_targets_by_account(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_brezzels_comment_targets_by_account(integer) TO service_role;