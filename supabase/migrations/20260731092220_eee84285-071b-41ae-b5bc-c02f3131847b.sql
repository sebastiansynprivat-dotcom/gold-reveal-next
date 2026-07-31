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
    qr.free_count::bigint AS free_count
  FROM quiz_routes qr
  WHERE qr.is_active = true
  ORDER BY qr.name;
$function$;

DROP TRIGGER IF EXISTS trg_decrement_free_count ON public.profiles;
CREATE TRIGGER trg_decrement_free_count
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.decrement_free_count_on_assign();