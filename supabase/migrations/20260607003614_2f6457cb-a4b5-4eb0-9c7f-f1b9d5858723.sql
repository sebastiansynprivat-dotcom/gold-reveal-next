
-- 1. Replace cascade with SET NULL so accounts_data survives account deletion
ALTER TABLE public.accounts_data
  DROP CONSTRAINT IF EXISTS accounts_revenue_account_id_fkey;

ALTER TABLE public.accounts_data
  ADD CONSTRAINT accounts_data_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;

-- 2. Snapshot model_id directly on accounts_data
ALTER TABLE public.accounts_data
  ADD COLUMN IF NOT EXISTS model_id uuid REFERENCES public.models(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS accounts_data_model_id_idx ON public.accounts_data(model_id);

-- 3. Backfill model_id from accounts
UPDATE public.accounts_data ad
SET model_id = a.model_id
FROM public.accounts a
WHERE ad.account_id = a.id
  AND ad.model_id IS NULL
  AND a.model_id IS NOT NULL;

-- 4. Trigger to auto-fill model_id on insert when not provided
CREATE OR REPLACE FUNCTION public.set_accounts_data_model_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.model_id IS NULL AND NEW.account_id IS NOT NULL THEN
    SELECT model_id INTO NEW.model_id FROM public.accounts WHERE id = NEW.account_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_accounts_data_model_id ON public.accounts_data;
CREATE TRIGGER trg_set_accounts_data_model_id
BEFORE INSERT OR UPDATE OF account_id ON public.accounts_data
FOR EACH ROW EXECUTE FUNCTION public.set_accounts_data_model_id();
