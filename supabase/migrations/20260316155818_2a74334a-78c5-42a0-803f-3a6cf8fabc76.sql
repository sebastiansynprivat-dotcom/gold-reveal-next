
-- Table for storing issued credit notes with sequential numbering
CREATE TABLE public.credit_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_number text NOT NULL UNIQUE,
  credit_note_date date NOT NULL DEFAULT CURRENT_DATE,
  service_period_start date NOT NULL DEFAULT CURRENT_DATE,
  service_period_end date NOT NULL DEFAULT CURRENT_DATE,
  
  -- Service provider (recipient)
  provider_name text NOT NULL DEFAULT '',
  provider_address text NOT NULL DEFAULT '',
  provider_is_business boolean NOT NULL DEFAULT false,
  provider_vat_id text DEFAULT '',
  
  -- Line item
  description text NOT NULL DEFAULT 'Revenue share payout',
  net_amount numeric NOT NULL DEFAULT 0,
  vat_rate numeric NOT NULL DEFAULT 0,
  vat_amount numeric NOT NULL DEFAULT 0,
  gross_amount numeric NOT NULL DEFAULT 0,
  
  -- Payment info
  payment_method text DEFAULT '',
  crypto_coin text DEFAULT 'USDT',
  tx_hash text DEFAULT '',
  exchange_rate text DEFAULT '',
  payment_date date DEFAULT CURRENT_DATE,
  
  -- Context
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Optional: link to chatter (local name, not DB user)
  chatter_name text DEFAULT ''
);

-- Sequence for credit note numbering
CREATE SEQUENCE public.credit_note_seq START 1 INCREMENT 1;

-- Function to get next credit note number (race-condition safe via sequence)
CREATE OR REPLACE FUNCTION public.next_credit_note_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- RLS
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on credit_notes"
ON public.credit_notes FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Models can view own credit_notes"
ON public.credit_notes FOR SELECT
TO authenticated
USING (
  account_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM model_users mu
    WHERE mu.account_id = credit_notes.account_id AND mu.user_id = auth.uid()
  )
);
