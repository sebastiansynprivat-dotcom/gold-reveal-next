CREATE OR REPLACE FUNCTION public.lowercase_account_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.account_email IS NOT NULL THEN
    NEW.account_email = LOWER(NEW.account_email);
  END IF;
  IF NEW.username IS NOT NULL THEN
    NEW.username = LOWER(NEW.username);
  END IF;
  RETURN NEW;
END;
$function$;

UPDATE public.accounts
   SET username = lower(username)
 WHERE username IS NOT NULL
   AND username <> lower(username);