
CREATE OR REPLACE FUNCTION public.lowercase_account_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.account_email IS NOT NULL THEN
    NEW.account_email = LOWER(NEW.account_email);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lowercase_account_email_trigger ON public.accounts;
CREATE TRIGGER lowercase_account_email_trigger
BEFORE INSERT OR UPDATE OF account_email ON public.accounts
FOR EACH ROW EXECUTE FUNCTION public.lowercase_account_email();
