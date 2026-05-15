ALTER TABLE public.chatters
  ADD COLUMN IF NOT EXISTS invoice_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_net_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_currency text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_service_period_start date,
  ADD COLUMN IF NOT EXISTS invoice_service_period_end date,
  ADD COLUMN IF NOT EXISTS invoice_payment_date date,
  ADD COLUMN IF NOT EXISTS invoice_crypto_network text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_crypto_coin text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_tx_hash text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_exchange_rate text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_receiver_wallet text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_last_credit_note_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_last_generated_at timestamp with time zone;

ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS invoice_description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_net_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invoice_currency text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_service_period_start date,
  ADD COLUMN IF NOT EXISTS invoice_service_period_end date,
  ADD COLUMN IF NOT EXISTS invoice_payment_date date,
  ADD COLUMN IF NOT EXISTS invoice_crypto_network text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_crypto_coin text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_tx_hash text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_exchange_rate text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_receiver_wallet text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_last_credit_note_number text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_last_generated_at timestamp with time zone;