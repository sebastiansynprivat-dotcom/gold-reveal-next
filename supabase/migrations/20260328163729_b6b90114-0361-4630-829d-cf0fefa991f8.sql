CREATE OR REPLACE FUNCTION public.get_free_account_counts()
RETURNS TABLE(route_id uuid, platform_name text, target_path text, free_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    qr.id AS route_id,
    qr.name AS platform_name,
    qr.target_path,
    COUNT(a.id) AS free_count
  FROM quiz_routes qr
  LEFT JOIN accounts a
    ON a.platform = qr.name
    AND a.assigned_to IS NULL
    AND a.model_active = true
  WHERE qr.is_active = true
  GROUP BY qr.id, qr.name, qr.target_path
  ORDER BY qr.name;
$$;