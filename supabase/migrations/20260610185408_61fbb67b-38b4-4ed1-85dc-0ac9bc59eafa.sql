CREATE OR REPLACE FUNCTION public.is_telegram_id_taken(p_telegram_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE COALESCE(pre_create, false) = false
      AND telegram_id IS NOT NULL
      AND lower(regexp_replace(telegram_id, '^@', '')) =
          lower(regexp_replace(COALESCE(p_telegram_id, ''), '^@', ''))
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_telegram_id_taken(text) TO anon, authenticated;