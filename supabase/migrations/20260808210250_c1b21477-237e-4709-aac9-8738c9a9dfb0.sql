ALTER TABLE public.brezzels_comment_assignments
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_bca_account_date ON public.brezzels_comment_assignments (account_id, assigned_date);
CREATE INDEX IF NOT EXISTS idx_bca_target_date ON public.brezzels_comment_assignments (target_id, assigned_date);

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
  v_existing int;
  v_needed int;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  FOR v_acc IN
    SELECT DISTINCT a.id, COALESCE(NULLIF(a.username,''), a.account_email) AS label,
           COALESCE(NULLIF(m.username,''), m.name) AS mname, a.created_at
      FROM public.accounts a
      LEFT JOIN public.models m ON m.id = a.model_id
     WHERE a.platform = 'brezzels'
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
          SELECT target_id, count(*) AS n
            FROM public.brezzels_comment_assignments
           WHERE assigned_date = v_today
           GROUP BY target_id
        ) g ON g.target_id = t.id
        LEFT JOIN (
          SELECT target_id, count(*) AS n
            FROM public.brezzels_comment_assignments
           WHERE assigned_date >= v_today - 6
           GROUP BY target_id
        ) gw ON gw.target_id = t.id
        LEFT JOIN (
          SELECT target_id, count(*) AS times_seen, max(assigned_date) AS last_seen
            FROM public.brezzels_comment_assignments
           WHERE user_id = v_user
           GROUP BY target_id
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