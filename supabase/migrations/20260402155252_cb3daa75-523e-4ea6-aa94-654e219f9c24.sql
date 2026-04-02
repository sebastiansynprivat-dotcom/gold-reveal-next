
-- Reset the sequence past the highest existing number
SELECT setval('public.credit_note_seq', 16, true);

-- Make next_credit_note_number handle conflicts by retrying
CREATE OR REPLACE FUNCTION public.next_credit_note_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_year text;
  v_seq int;
  v_number text;
BEGIN
  v_year := to_char(now(), 'YYYY');
  
  -- Loop to skip over any existing numbers
  LOOP
    v_seq := nextval('credit_note_seq');
    v_number := 'GS-' || v_year || '-' || lpad(v_seq::text, 4, '0');
    
    -- Check if this number already exists
    IF NOT EXISTS (SELECT 1 FROM credit_notes WHERE credit_note_number = v_number) THEN
      RETURN v_number;
    END IF;
  END LOOP;
END;
$$;
