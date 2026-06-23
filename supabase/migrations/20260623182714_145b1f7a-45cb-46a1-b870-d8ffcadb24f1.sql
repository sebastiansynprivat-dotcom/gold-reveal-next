
CREATE OR REPLACE FUNCTION public.get_chatter_revenue_series_for_user(p_user_id uuid, p_from date, p_to date)
RETURNS TABLE(date date, total numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF auth.uid() <> p_user_id AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
    SELECT ad.date, SUM(ad.total)::numeric AS total
      FROM public.account_assignments aa
      JOIN public.accounts_data ad
        ON ad.account_id = aa.account_id
       AND ad.date >= aa.start_date
       AND ad.date <= COALESCE(aa.end_date, current_date)
     WHERE aa.user_id = p_user_id
       AND ad.date BETWEEN p_from AND p_to
     GROUP BY ad.date
     ORDER BY ad.date;
END;
$$;
