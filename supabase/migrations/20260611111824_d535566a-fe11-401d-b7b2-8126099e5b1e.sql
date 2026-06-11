CREATE OR REPLACE FUNCTION public.get_chatter_real_stats(p_user_ids uuid[])
RETURNS TABLE(
  user_id uuid,
  today numeric,
  week numeric,
  month numeric,
  all_time numeric,
  prev_week numeric,
  prev_month numeric,
  mass_dms integer,
  open_chats integer,
  avg_open_days numeric,
  sparkline jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := current_date;
  v_week_start date := current_date - interval '6 days';
  v_prev_week_start date := current_date - interval '13 days';
  v_prev_week_end date := current_date - interval '7 days';
  v_month_start date := date_trunc('month', current_date)::date;
  v_prev_month_start date := (date_trunc('month', current_date) - interval '1 month')::date;
  v_prev_month_end date := (date_trunc('month', current_date) - interval '1 day')::date;
  v_spark_start date := (current_date - interval '7 weeks')::date - ((extract(dow from current_date)::int + 6) % 7);
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH targets AS (
    SELECT u AS uid, (SELECT id FROM profiles p WHERE p.user_id = u LIMIT 1) AS pid
    FROM unnest(p_user_ids) AS u
  ),
  asg AS (
    SELECT t.uid, aa.account_id, aa.start_date, COALESCE(aa.end_date, v_today) AS end_date, aa.end_date IS NULL AS is_open
    FROM targets t
    JOIN account_assignments aa
      ON (aa.user_id = t.uid) OR (t.pid IS NOT NULL AND aa.profile_id = t.pid)
  ),
  rev AS (
    SELECT a.uid, ad.date, SUM(ad.total)::numeric AS total
    FROM asg a
    JOIN accounts_data ad
      ON ad.account_id = a.account_id
     AND ad.date >= a.start_date
     AND ad.date <= a.end_date
    GROUP BY a.uid, ad.date
  ),
  rev_agg AS (
    SELECT
      r.uid,
      COALESCE(SUM(r.total) FILTER (WHERE r.date = v_today), 0) AS today,
      COALESCE(SUM(r.total) FILTER (WHERE r.date >= v_week_start), 0) AS week,
      COALESCE(SUM(r.total) FILTER (WHERE r.date >= v_month_start), 0) AS month,
      COALESCE(SUM(r.total), 0) AS all_time,
      COALESCE(SUM(r.total) FILTER (WHERE r.date BETWEEN v_prev_week_start AND v_prev_week_end), 0) AS prev_week,
      COALESCE(SUM(r.total) FILTER (WHERE r.date BETWEEN v_prev_month_start AND v_prev_month_end), 0) AS prev_month
    FROM rev r
    GROUP BY r.uid
  ),
  open_latest AS (
    SELECT DISTINCT ON (a.uid, a.account_id) a.uid, a.account_id, ad.mass_dms, ad.unread_chats, ad.oldest_chat
    FROM asg a
    JOIN accounts_data ad ON ad.account_id = a.account_id
    WHERE a.is_open
    ORDER BY a.uid, a.account_id, ad.date DESC
  ),
  activity AS (
    SELECT
      ol.uid,
      COALESCE(SUM(ol.mass_dms), 0)::int AS mass_dms,
      COALESCE(SUM(ol.unread_chats), 0)::int AS open_chats,
      COALESCE(AVG(NULLIF(ol.oldest_chat, 0)), 0)::numeric AS avg_open_days
    FROM open_latest ol
    GROUP BY ol.uid
  ),
  weeks AS (
    SELECT generate_series(0, 7) AS wi
  ),
  weekly AS (
    SELECT t.uid, w.wi,
      (v_spark_start + (w.wi * 7))::date AS week_start,
      COALESCE(SUM(r.total), 0) AS total
    FROM targets t
    CROSS JOIN weeks w
    LEFT JOIN rev r ON r.uid = t.uid
      AND r.date >= (v_spark_start + (w.wi * 7))::date
      AND r.date <  (v_spark_start + ((w.wi + 1) * 7))::date
    GROUP BY t.uid, w.wi
  ),
  spark AS (
    SELECT wk.uid, jsonb_agg(jsonb_build_object('week_start', wk.week_start, 'total', wk.total) ORDER BY wk.wi) AS sparkline
    FROM weekly wk
    GROUP BY wk.uid
  )
  SELECT
    t.uid,
    COALESCE(ra.today, 0),
    COALESCE(ra.week, 0),
    COALESCE(ra.month, 0),
    COALESCE(ra.all_time, 0),
    COALESCE(ra.prev_week, 0),
    COALESCE(ra.prev_month, 0),
    COALESCE(ac.mass_dms, 0),
    COALESCE(ac.open_chats, 0),
    COALESCE(ac.avg_open_days, 0),
    COALESCE(sp.sparkline, '[]'::jsonb)
  FROM targets t
  LEFT JOIN rev_agg ra ON ra.uid = t.uid
  LEFT JOIN activity ac ON ac.uid = t.uid
  LEFT JOIN spark sp ON sp.uid = t.uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_chatter_real_stats(uuid[]) TO authenticated;