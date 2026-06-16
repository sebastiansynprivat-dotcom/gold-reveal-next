
ALTER TABLE public.credit_notes
ADD COLUMN IF NOT EXISTS settled_by_credit_note_number text;

COMMENT ON COLUMN public.credit_notes.settled_by_credit_note_number IS
'When this credit note was below the payout threshold and got bundled into a later invoice, this stores that later invoice number. Used to display "Beglichen in GS-XXXX" hint.';
