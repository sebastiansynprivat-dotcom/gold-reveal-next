
CREATE OR REPLACE FUNCTION public.increment_route_counter()
RETURNS integer
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE route_counter
  SET counter = counter + 1
  RETURNING counter - 1;
$$;
