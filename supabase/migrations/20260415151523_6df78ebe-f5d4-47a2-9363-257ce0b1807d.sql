
ALTER TABLE public.chatters
ADD COLUMN payment_method text NOT NULL DEFAULT 'crypto',
ADD COLUMN bank_account_holder text DEFAULT '',
ADD COLUMN bank_iban text DEFAULT '',
ADD COLUMN bank_bic text DEFAULT '',
ADD COLUMN bank_name text DEFAULT '';
