
-- 1) Add language to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'de';

-- 2) Pre-chatter staging table
CREATE TABLE IF NOT EXISTS public.pre_chatters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  telegram_id text NOT NULL,
  language text NOT NULL DEFAULT 'de',
  preassigned_account_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  claimed_user_id uuid,
  CONSTRAINT pre_chatters_telegram_unique UNIQUE (telegram_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pre_chatters TO authenticated;
GRANT ALL ON public.pre_chatters TO service_role;

ALTER TABLE public.pre_chatters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pre_chatters"
  ON public.pre_chatters FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Service role full access pre_chatters"
  ON public.pre_chatters FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS pre_chatters_telegram_idx ON public.pre_chatters (telegram_id);

-- 3) Claim function: when a profile gets its telegram_id, match it to a pre_chatters row
CREATE OR REPLACE FUNCTION public.claim_pre_chatter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pre RECORD;
  v_norm text;
BEGIN
  IF NEW.telegram_id IS NULL OR NEW.telegram_id = '' THEN
    RETURN NEW;
  END IF;

  -- Only run when telegram_id was just set or changed
  IF TG_OP = 'UPDATE' AND COALESCE(OLD.telegram_id, '') = COALESCE(NEW.telegram_id, '') THEN
    RETURN NEW;
  END IF;

  v_norm := lower(regexp_replace(NEW.telegram_id, '^@', ''));

  SELECT * INTO v_pre FROM public.pre_chatters
    WHERE lower(regexp_replace(telegram_id, '^@', '')) = v_norm
      AND claimed_at IS NULL
    LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Apply name only if profile has no group_name yet
  IF v_pre.name IS NOT NULL AND v_pre.name <> '' AND (NEW.group_name IS NULL OR NEW.group_name = '') THEN
    NEW.group_name := v_pre.name;
  END IF;

  NEW.language := v_pre.language;

  -- Pre-assign account if specified and still free
  IF v_pre.preassigned_account_id IS NOT NULL THEN
    UPDATE public.accounts
      SET assigned_to = NEW.user_id, assigned_at = now()
      WHERE id = v_pre.preassigned_account_id AND assigned_to IS NULL;
  END IF;

  UPDATE public.pre_chatters
    SET claimed_at = now(), claimed_user_id = NEW.user_id
    WHERE id = v_pre.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_claim_pre_chatter ON public.profiles;
CREATE TRIGGER trg_claim_pre_chatter
  BEFORE INSERT OR UPDATE OF telegram_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.claim_pre_chatter();
