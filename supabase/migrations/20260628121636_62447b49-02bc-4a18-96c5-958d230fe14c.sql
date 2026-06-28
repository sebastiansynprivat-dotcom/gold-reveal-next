
-- Attach the existing claim_pre_chatter() merge function as a BEFORE INSERT/UPDATE
-- trigger on profiles. It absorbs any orphan pre_create profile that shares the
-- same normalized telegram_id, moves its account_assignments onto the real profile,
-- and deletes the duplicate — eliminating the unique-violation that was blocking
-- chatters from saving their Telegram ID.
DROP TRIGGER IF EXISTS trg_profiles_claim_pre_chatter ON public.profiles;

CREATE TRIGGER trg_profiles_claim_pre_chatter
BEFORE INSERT OR UPDATE OF telegram_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.claim_pre_chatter();
