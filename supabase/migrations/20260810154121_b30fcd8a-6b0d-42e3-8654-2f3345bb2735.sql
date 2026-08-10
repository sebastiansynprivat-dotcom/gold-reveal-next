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
  v_existing int;
  v_needed int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- first (oldest) brezzels account of this chatter
  SELECT a.id INTO v_first_acc
    FROM public.accounts a
   WHERE lower(a.platform) = 'brezzels'
     AND (
       a.assigned_to = v_user
       OR EXISTS (
         SELECT 1 FROM public.account_assignments aa
          WHERE aa.account_id = a.id
            AND aa.end_date IS NULL
            AND (aa.user_id = v_user
                 OR aa.profile_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = v_user))
       )
     )
   ORDER BY a.created_at ASC
   LIMIT 1;

  -- legacy rows without account link would otherwise be invisible
  IF v_first_acc IS NOT NULL THEN
    UPDATE public.brezzels_comment_assignments
       SET account_id = v_first_acc
     WHERE user_id = v_user
       AND assigned_date = v_today
       AND account_id IS NULL;
  END IF;

  FOR v_acc IN
    SELECT DISTINCT a.id, a.created_at
      FROM public.accounts a
     WHERE lower(a.platform) = 'brezzels'
       AND (
         a.assigned_to = v_user
         OR EXISTS (
           SELECT 1 FROM public.account_assignments aa
            WHERE aa.account_id = a.id
              AND aa.end_date IS NULL
              AND (aa.user_id = v_user
                   OR aa.profile_id IN (SELECT p.id FROM public.profiles p WHERE p.user_id = v_user))
         )
       )
     ORDER BY a.created_at ASC
  LOOP
    SELECT count(*) INTO v_existing
      FROM public.brezzels_comment_assignments
     WHERE user_id = v_user AND assigned_date = v_today AND account_id = v_acc.id;

    v_needed := GREATEST(0, p_count - v_existing);

    IF v_needed > 0 THEN
      INSERT INTO public.brezzels_comment_assignments (user_id, target_id, assigned_date, account_id)
      SELECT v_user, t.id, v_today, v_acc.id
        FROM public.brezzels_comment_targets t
        LEFT JOIN (
          SELECT bca.target_id, count(*) AS n
            FROM public.brezzels_comment_assignments bca
           WHERE bca.assigned_date = v_today
           GROUP BY bca.target_id
        ) g ON g.target_id = t.id
        LEFT JOIN (
          SELECT bca.target_id, count(*) AS n
            FROM public.brezzels_comment_assignments bca
           WHERE bca.assigned_date >= v_today - 6
           GROUP BY bca.target_id
        ) gw ON gw.target_id = t.id
        LEFT JOIN (
          SELECT bca.target_id, count(*) AS times_seen, max(bca.assigned_date) AS last_seen
            FROM public.brezzels_comment_assignments bca
           WHERE bca.user_id = v_user
           GROUP BY bca.target_id
        ) h ON h.target_id = t.id
       WHERE t.active = true
         AND NOT EXISTS (
           SELECT 1 FROM public.brezzels_comment_assignments a2
            WHERE a2.user_id = v_user
              AND a2.assigned_date = v_today
              AND a2.target_id = t.id
         )
       ORDER BY COALESCE(g.n, 0) ASC,
                COALESCE(gw.n, 0) ASC,
                COALESCE(h.times_seen, 0) ASC,
                COALESCE(h.last_seen, '1970-01-01'::date) ASC,
                random()
       LIMIT v_needed
      ON CONFLICT (user_id, target_id, assigned_date) DO NOTHING;
    END IF;
  END LOOP;

  RETURN QUERY
  SELECT a.id,
         COALESCE(NULLIF(a.username,''), a.account_email)::text,
         COALESCE(NULLIF(m.username,''), m.name)::text,
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

GRANT EXECUTE ON FUNCTION public.get_brezzels_comment_targets_by_account(integer) TO authenticated;