
-- Function to get current credit note sequence value
CREATE OR REPLACE FUNCTION public.get_credit_note_seq()
RETURNS bigint
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT last_value FROM public.credit_note_seq;
$$;

-- Function to set credit note sequence value (admin only)
CREATE OR REPLACE FUNCTION public.set_credit_note_seq(new_val bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can change the sequence';
  END IF;
  PERFORM setval('public.credit_note_seq', new_val, true);
END;
$$;
