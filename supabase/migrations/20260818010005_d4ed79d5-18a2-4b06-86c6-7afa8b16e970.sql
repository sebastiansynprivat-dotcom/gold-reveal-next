CREATE OR REPLACE FUNCTION public.get_account_chatter_stats_window(
  p_account_id uuid,
  p_user_id uuid,
  p_start date,
  p_end date
)
RETURNS TABLE(
  total numeric,
  days integer,
  avg_per_day numeric,
  mass_dms integer,
  oldest_chat integer,
  series jsonb
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF auth.uid() IS DISTINCT FROM p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH rev AS (
    SELECT ad.date,
           SUM(ad.total)::numeric AS total,
           MAX(COALESCE(ad.mass_dms, 0))::int AS mass_dms,
           MAX(COALESCE(ad.oldest_chat, 0))::int AS oldest_chat
    FROM public.accounts_data ad
    WHERE ad.account_id = p_account_id
      AND ad.date >= p_start
      AND ad.date <= p_end
    GROUP BY ad.date
  ),
  latest AS (
    SELECT r.mass_dms, r.oldest_chat FROM rev r ORDER BY r.date DESC LIMIT 1
  )
  SELECT
    COALESCE((SELECT SUM(r.total) FROM rev r), 0)::numeric,
    GREATEST((p_end - p_start) + 1, 1)::int,
    ROUND(COALESCE((SELECT SUM(r.total) FROM rev r), 0) / GREATEST((p_end - p_start) + 1, 1), 2)::numeric,
    COALESCE((SELECT l.mass_dms FROM latest l), 0)::int,
    COALESCE((SELECT l.oldest_chat FROM latest l), 0)::int,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('date', r.date, 'total', r.total) ORDER BY r.date) FROM rev r), '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_account_chatter_stats_window(uuid, uuid, date, date) TO authenticated;