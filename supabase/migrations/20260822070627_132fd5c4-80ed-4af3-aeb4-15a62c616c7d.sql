CREATE OR REPLACE FUNCTION public.get_chatter_data_freshness()
RETURNS timestamptz
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH assigned_accounts AS (
    SELECT DISTINCT aa.account_id
    FROM public.account_assignments aa
    JOIN public.accounts a ON a.id = aa.account_id
    WHERE aa.user_id = auth.uid()
      AND aa.unassigned_at IS NULL
      AND COALESCE(a.model_active, true) = true
  ), per_account AS (
    SELECT assigned.account_id,
           COALESCE(
             max(ad.updated_at) FILTER (WHERE ad.date = CURRENT_DATE),
             max(ad.updated_at)
           ) AS effective_update
    FROM assigned_accounts assigned
    LEFT JOIN public.accounts_data ad ON ad.account_id = assigned.account_id
    GROUP BY assigned.account_id
  )
  SELECT min(effective_update)
  FROM per_account;
$$;

REVOKE EXECUTE ON FUNCTION public.get_chatter_data_freshness() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_chatter_data_freshness() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_stale_ingest_accounts(p_hours integer DEFAULT 3)
RETURNS TABLE(
  account_id uuid,
  account_email text,
  username text,
  platform text,
  last_update timestamptz,
  total numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT a.id,
         a.account_email,
         a.username,
         COALESCE(today.platform, a.platform) AS platform,
         COALESCE(today.updated_at, latest.updated_at) AS last_update,
         today.total
  FROM public.accounts a
  LEFT JOIN LATERAL (
    SELECT ad.platform, ad.updated_at, ad.total
    FROM public.accounts_data ad
    WHERE ad.account_id = a.id
      AND ad.date = CURRENT_DATE
    ORDER BY ad.updated_at DESC
    LIMIT 1
  ) today ON true
  LEFT JOIN LATERAL (
    SELECT ad.updated_at
    FROM public.accounts_data ad
    WHERE ad.account_id = a.id
    ORDER BY ad.date DESC, ad.updated_at DESC
    LIMIT 1
  ) latest ON true
  WHERE COALESCE(a.model_active, true) = true
    AND (
      today.updated_at IS NULL
      OR today.updated_at < now() - make_interval(hours => GREATEST(p_hours, 1))
    )
  ORDER BY COALESCE(today.platform, a.platform), COALESCE(today.updated_at, latest.updated_at) NULLS FIRST;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_stale_ingest_accounts(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_stale_ingest_accounts(integer) TO authenticated;