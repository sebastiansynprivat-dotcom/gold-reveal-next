CREATE OR REPLACE FUNCTION public.get_fourbased_revenue_by_model()
RETURNS TABLE(model_id uuid, total numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ad.model_id, SUM(ad.total)::numeric
  FROM public.accounts_data ad
  WHERE ad.model_id IS NOT NULL
    AND lower(ad.platform) = '4based'
  GROUP BY ad.model_id
$$;

REVOKE ALL ON FUNCTION public.get_fourbased_revenue_by_model() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_fourbased_revenue_by_model() TO authenticated;