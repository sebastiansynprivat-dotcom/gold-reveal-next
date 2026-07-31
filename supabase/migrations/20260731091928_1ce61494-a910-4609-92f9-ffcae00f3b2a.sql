-- Live-computed free account counts per quiz route (no more stale manual numbers)
CREATE OR REPLACE FUNCTION public.get_free_account_counts()
RETURNS TABLE(route_id uuid, platform_name text, target_path text, free_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    qr.id AS route_id,
    qr.name AS platform_name,
    qr.target_path,
    (
      SELECT count(*)
      FROM public.accounts a
      WHERE lower(a.platform) = lower(qr.name)
        AND a.assigned_to IS NULL
    )::bigint AS free_count
  FROM public.quiz_routes qr
  WHERE qr.is_active = true
  ORDER BY qr.name;
$function$;

-- The manual counter is no longer used, so stop decrementing it.
DROP TRIGGER IF EXISTS trg_decrement_free_count ON public.profiles;