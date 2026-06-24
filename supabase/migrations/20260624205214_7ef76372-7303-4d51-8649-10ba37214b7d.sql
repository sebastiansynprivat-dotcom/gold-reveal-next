CREATE OR REPLACE FUNCTION public.get_chatter_revenue_series(p_from date, p_to date)
 RETURNS TABLE(date date, total numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH my_profile AS (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  ),
  user_accounts AS (
    SELECT aa.account_id,
           MIN(aa.start_date) AS first_start,
           BOOL_OR(aa.end_date IS NULL) AS has_open,
           MAX(aa.end_date)  AS last_end
      FROM public.account_assignments aa
     WHERE aa.user_id = auth.uid()
        OR aa.profile_id IN (SELECT id FROM my_profile)
     GROUP BY aa.account_id
  )
  SELECT ad.date, SUM(ad.total)::numeric AS total
    FROM user_accounts ua
    JOIN public.accounts_data ad
      ON ad.account_id = ua.account_id
     AND ad.date >= ua.first_start
     AND ad.date <= CASE WHEN ua.has_open THEN current_date ELSE ua.last_end END
   WHERE ad.date BETWEEN p_from AND p_to
   GROUP BY ad.date
   ORDER BY ad.date;
$function$;

CREATE OR REPLACE FUNCTION public.get_chatter_revenue_series_for_user(p_user_id uuid, p_from date, p_to date)
 RETURNS TABLE(date date, total numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF auth.uid() <> p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
    WITH my_profile AS (
      SELECT id FROM public.profiles WHERE user_id = p_user_id
    ),
    user_accounts AS (
      SELECT aa.account_id,
             MIN(aa.start_date) AS first_start,
             BOOL_OR(aa.end_date IS NULL) AS has_open,
             MAX(aa.end_date)  AS last_end
        FROM public.account_assignments aa
       WHERE aa.user_id = p_user_id
          OR aa.profile_id IN (SELECT id FROM my_profile)
       GROUP BY aa.account_id
    )
    SELECT ad.date, SUM(ad.total)::numeric AS total
      FROM user_accounts ua
      JOIN public.accounts_data ad
        ON ad.account_id = ua.account_id
       AND ad.date >= ua.first_start
       AND ad.date <= CASE WHEN ua.has_open THEN current_date ELSE ua.last_end END
     WHERE ad.date BETWEEN p_from AND p_to
     GROUP BY ad.date
     ORDER BY ad.date;
END;
$function$;