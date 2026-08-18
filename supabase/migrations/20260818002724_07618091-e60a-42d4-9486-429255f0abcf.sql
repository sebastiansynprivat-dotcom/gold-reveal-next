CREATE OR REPLACE FUNCTION public.get_account_chatter_stats(p_account_id uuid, p_user_id uuid)
RETURNS TABLE(
  today numeric,
  yesterday numeric,
  week numeric,
  month numeric,
  all_time numeric,
  mass_dms integer,
  open_chats integer,
  oldest_chat integer,
  assigned_since date
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_today date := current_date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF auth.uid() IS DISTINCT FROM p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH asg AS (
    SELECT aa.start_date, COALESCE(aa.end_date, v_today) AS end_date
    FROM public.account_assignments aa
    WHERE aa.account_id = p_account_id
      AND aa.user_id = p_user_id
      AND aa.start_date IS NOT NULL
  ),
  rev AS (
    SELECT ad.date,
           SUM(ad.total)::numeric AS total,
           MAX(COALESCE(ad.mass_dms, 0))::int AS mass_dms,
           MAX(COALESCE(ad.unread_chats, 0))::int AS unread_chats,
           MAX(COALESCE(ad.oldest_chat, 0))::int AS oldest_chat
    FROM public.accounts_data ad
    WHERE ad.account_id = p_account_id
      AND EXISTS (
        SELECT 1 FROM asg a
        WHERE ad.date >= a.start_date AND ad.date <= a.end_date
      )
    GROUP BY ad.date
  ),
  latest AS (
    SELECT r.mass_dms, r.unread_chats, r.oldest_chat
    FROM rev r
    ORDER BY r.date DESC
    LIMIT 1
  )
  SELECT
    COALESCE((SELECT SUM(r.total) FROM rev r WHERE r.date = v_today), 0),
    COALESCE((SELECT SUM(r.total) FROM rev r WHERE r.date = v_today - 1), 0),
    COALESCE((SELECT SUM(r.total) FROM rev r WHERE r.date >= v_today - 6), 0),
    COALESCE((SELECT SUM(r.total) FROM rev r WHERE r.date >= date_trunc('month', v_today)::date), 0),
    COALESCE((SELECT SUM(r.total) FROM rev r), 0),
    COALESCE((SELECT l.mass_dms FROM latest l), 0),
    COALESCE((SELECT l.unread_chats FROM latest l), 0),
    COALESCE((SELECT l.oldest_chat FROM latest l), 0),
    (SELECT MAX(a.start_date) FROM asg a);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_account_chatter_stats(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_account_chatter_stats(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_account_chatter_stats(uuid, uuid) TO service_role;