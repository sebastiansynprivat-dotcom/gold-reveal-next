-- Freshness of today's revenue data for the calling chatter
CREATE OR REPLACE FUNCTION public.get_chatter_data_freshness()
RETURNS timestamptz
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT max(ad.updated_at)
  FROM public.accounts_data ad
  JOIN public.account_assignments aa
    ON aa.account_id = ad.account_id
   AND aa.unassigned_at IS NULL
  WHERE aa.user_id = auth.uid()
    AND ad.date = CURRENT_DATE;
$$;

REVOKE EXECUTE ON FUNCTION public.get_chatter_data_freshness() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_chatter_data_freshness() TO authenticated;

-- Accounts whose today's row has not been refreshed for p_hours hours (admins only)
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
         COALESCE(ad.platform, a.platform) AS platform,
         ad.updated_at,
         ad.total
  FROM public.accounts a
  JOIN public.accounts_data ad
    ON ad.account_id = a.id
   AND ad.date = CURRENT_DATE
  WHERE COALESCE(a.model_active, true) = true
    AND ad.updated_at < now() - make_interval(hours => GREATEST(p_hours, 1))
  ORDER BY COALESCE(ad.platform, a.platform), ad.updated_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_stale_ingest_accounts(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_stale_ingest_accounts(integer) TO authenticated;