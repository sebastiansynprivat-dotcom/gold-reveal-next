-- Add manual free_count column to quiz_routes
ALTER TABLE public.quiz_routes ADD COLUMN IF NOT EXISTS free_count integer NOT NULL DEFAULT 0;

-- Update get_free_account_counts to read from quiz_routes.free_count instead of counting accounts
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
    qr.free_count::bigint AS free_count
  FROM quiz_routes qr
  WHERE qr.is_active = true
  ORDER BY qr.name;
$$;

-- Decrement free_count on the matching quiz_route when an account is assigned via offer
CREATE OR REPLACE FUNCTION public.decrement_free_count_on_assign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only fire when offer was just set (from empty to something)
  IF (OLD.offer IS NULL OR OLD.offer = '') AND NEW.offer IS NOT NULL AND NEW.offer != '' THEN
    UPDATE public.quiz_routes
    SET free_count = GREATEST(free_count - 1, 0)
    WHERE name = NEW.offer AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on profiles.offer update to decrement free count
CREATE TRIGGER trg_decrement_free_count
  AFTER UPDATE OF offer ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_free_count_on_assign();