ALTER TABLE public.payout_revenue
  ADD COLUMN IF NOT EXISTS billed_at timestamptz,
  ADD COLUMN IF NOT EXISTS billed_credit_note_number text,
  ADD COLUMN IF NOT EXISTS billed_amount numeric;

CREATE INDEX IF NOT EXISTS payout_revenue_model_billed_idx
  ON public.payout_revenue (model_id, billed_at);