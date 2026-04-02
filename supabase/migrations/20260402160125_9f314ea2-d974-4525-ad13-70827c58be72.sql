
-- 1. Fix set_credit_note_seq: use setval with false so nextval returns exactly new_val
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
  PERFORM setval('public.credit_note_seq', new_val, false);
END;
$$;

-- 2. Fix next_credit_note_number: remove duplicate-skip loop
CREATE OR REPLACE FUNCTION public.next_credit_note_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_year text;
  v_seq int;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_seq := nextval('credit_note_seq');
  RETURN 'GS-' || v_year || '-' || lpad(v_seq::text, 4, '0');
END;
$$;

-- 3. Drop unique constraint on credit_note_number so reused numbers don't cause errors
ALTER TABLE public.credit_notes DROP CONSTRAINT IF EXISTS credit_notes_credit_note_number_key;
