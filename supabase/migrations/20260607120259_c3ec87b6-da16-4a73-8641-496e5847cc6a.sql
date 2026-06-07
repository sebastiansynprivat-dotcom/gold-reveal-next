
-- =====================================================================
-- 1. PROFILES: allow pre-create rows (user_id null, pre_create flag)
-- =====================================================================
ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pre_create boolean NOT NULL DEFAULT false;

-- replace the unique constraint with a partial unique index (so multiple null user_ids allowed)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_unique
  ON public.profiles(user_id) WHERE user_id IS NOT NULL;

-- prevent duplicate pre-creates for the same telegram handle
CREATE UNIQUE INDEX IF NOT EXISTS profiles_pre_create_telegram_unique
  ON public.profiles(lower(regexp_replace(telegram_id, '^@', '')))
  WHERE pre_create = true;

CREATE INDEX IF NOT EXISTS profiles_pre_create_idx
  ON public.profiles(pre_create) WHERE pre_create;

-- admin policies for pre-create rows (self-policies stay; they naturally exclude user_id null)
DROP POLICY IF EXISTS "Admins manage pre_create profiles" ON public.profiles;
CREATE POLICY "Admins manage pre_create profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (pre_create AND is_admin())
  WITH CHECK (pre_create AND is_admin());

-- =====================================================================
-- 2. ACCOUNT_ASSIGNMENTS: profile_id, start_date, end_date; user_id nullable
-- =====================================================================
ALTER TABLE public.account_assignments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.account_assignments
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date;

-- backfill profile_id + start/end dates for existing rows
UPDATE public.account_assignments aa
   SET profile_id = p.id
  FROM public.profiles p
 WHERE aa.profile_id IS NULL
   AND aa.user_id IS NOT NULL
   AND p.user_id = aa.user_id;

UPDATE public.account_assignments
   SET start_date = COALESCE(start_date, assigned_at::date),
       end_date   = COALESCE(end_date, unassigned_at::date);

-- enforce default + not null going forward
ALTER TABLE public.account_assignments ALTER COLUMN start_date SET DEFAULT current_date;
ALTER TABLE public.account_assignments ALTER COLUMN start_date SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_account_assignments_profile_id ON public.account_assignments(profile_id);
CREATE INDEX IF NOT EXISTS idx_account_assignments_profile_start ON public.account_assignments(profile_id, start_date);
CREATE INDEX IF NOT EXISTS idx_account_assignments_user_start ON public.account_assignments(user_id, start_date);

-- INSERT policy for admins (was missing — needed for direct-assign + pre-create writes)
DROP POLICY IF EXISTS "Admins insert account_assignments" ON public.account_assignments;
CREATE POLICY "Admins insert account_assignments" ON public.account_assignments
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- =====================================================================
-- 3. MIGRATE pre_chatters → profiles + account_assignments
-- =====================================================================
DO $mig$
DECLARE
  v_pre RECORD;
  v_account_taken_by uuid;
  v_new_profile_id uuid;
  v_skipped_no_account int := 0;
  v_skipped_taken int := 0;
  v_migrated int := 0;
BEGIN
  FOR v_pre IN
    SELECT pc.*
      FROM public.pre_chatters pc
     WHERE pc.claimed_at IS NULL
     ORDER BY pc.created_at
  LOOP
    -- Skip rule 1: no preassigned account
    IF v_pre.preassigned_account_id IS NULL THEN
      v_skipped_no_account := v_skipped_no_account + 1;
      RAISE NOTICE 'SKIP[no_account] pre_chatter=% telegram=%', v_pre.id, v_pre.telegram_id;
      CONTINUE;
    END IF;

    -- Skip rule 2: preassigned account already taken
    SELECT assigned_to INTO v_account_taken_by
      FROM public.accounts WHERE id = v_pre.preassigned_account_id;
    IF v_account_taken_by IS NOT NULL THEN
      v_skipped_taken := v_skipped_taken + 1;
      RAISE NOTICE 'SKIP[account_taken] pre_chatter=% telegram=% account=% taken_by=%',
        v_pre.id, v_pre.telegram_id, v_pre.preassigned_account_id, v_account_taken_by;
      CONTINUE;
    END IF;

    -- Insert pre-create profile (skip if telegram dup exists)
    INSERT INTO public.profiles (user_id, pre_create, name, telegram_id, language, group_name)
    VALUES (NULL, true, COALESCE(v_pre.name, ''), v_pre.telegram_id, COALESCE(v_pre.language, 'de'), COALESCE(v_pre.name, ''))
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_new_profile_id;

    IF v_new_profile_id IS NULL THEN
      SELECT id INTO v_new_profile_id
        FROM public.profiles
       WHERE pre_create = true
         AND lower(regexp_replace(telegram_id, '^@', '')) = lower(regexp_replace(v_pre.telegram_id, '^@', ''))
       LIMIT 1;
    END IF;

    -- Insert open assignment
    INSERT INTO public.account_assignments (account_id, user_id, profile_id, assigned_at, start_date, end_date, unassigned_at)
    VALUES (v_pre.preassigned_account_id, NULL, v_new_profile_id, v_pre.created_at, v_pre.created_at::date, NULL, NULL);

    v_migrated := v_migrated + 1;
  END LOOP;

  RAISE NOTICE 'pre_chatters migration: migrated=% skipped_no_account=% skipped_account_taken=%',
    v_migrated, v_skipped_no_account, v_skipped_taken;
END
$mig$;

-- =====================================================================
-- 4. TRIGGERS
-- =====================================================================

-- Updated claim trigger: handles both fresh signups AND pre-create profile claim
CREATE OR REPLACE FUNCTION public.claim_pre_chatter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_norm text;
  v_pre_profile_id uuid;
  v_aa RECORD;
BEGIN
  IF NEW.telegram_id IS NULL OR NEW.telegram_id = '' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND COALESCE(OLD.telegram_id, '') = COALESCE(NEW.telegram_id, '') THEN
    RETURN NEW;
  END IF;

  v_norm := lower(regexp_replace(NEW.telegram_id, '^@', ''));

  -- find a pre-create profile with that telegram (skip ourselves)
  SELECT id INTO v_pre_profile_id
    FROM public.profiles
   WHERE pre_create = true
     AND id <> NEW.id
     AND lower(regexp_replace(telegram_id, '^@', '')) = v_norm
   LIMIT 1;

  IF v_pre_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- fill new profile fields from the pre-create row where empty
  UPDATE public.profiles src
     SET pre_create = false  -- ensure clearing (we'll delete it below but be safe)
   WHERE id = v_pre_profile_id;

  -- copy language/name if NEW is empty
  SELECT * INTO v_aa FROM public.profiles WHERE id = v_pre_profile_id;
  IF (NEW.group_name IS NULL OR NEW.group_name = '') AND v_aa.name IS NOT NULL AND v_aa.name <> '' THEN
    NEW.group_name := v_aa.name;
  END IF;
  IF v_aa.language IS NOT NULL THEN
    NEW.language := v_aa.language;
  END IF;

  -- transfer open assignments from pre-create profile to the new user
  FOR v_aa IN
    SELECT * FROM public.account_assignments
     WHERE profile_id = v_pre_profile_id AND end_date IS NULL
  LOOP
    UPDATE public.account_assignments
       SET user_id = NEW.user_id, profile_id = NEW.id
     WHERE id = v_aa.id;

    -- mirror to accounts.assigned_to if free
    UPDATE public.accounts
       SET assigned_to = NEW.user_id, assigned_at = COALESCE(assigned_at, now())
     WHERE id = v_aa.account_id AND assigned_to IS NULL;
  END LOOP;

  -- delete the pre-create profile (its assignments now point elsewhere)
  DELETE FROM public.profiles WHERE id = v_pre_profile_id;

  RETURN NEW;
END
$fn$;

-- track_account_assignment: idempotent, sets profile_id + start/end dates
CREATE OR REPLACE FUNCTION public.track_account_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_profile_id uuid;
BEGIN
  -- Close previous assignment when assigned_to clears/changes
  IF OLD.assigned_to IS NOT NULL AND (NEW.assigned_to IS NULL OR OLD.assigned_to <> NEW.assigned_to) THEN
    UPDATE public.account_assignments
       SET unassigned_at = now(),
           end_date = COALESCE(end_date, current_date)
     WHERE account_id = OLD.id
       AND user_id = OLD.assigned_to
       AND end_date IS NULL;
  END IF;

  -- Open a new assignment if assigned_to was set/changed AND no open row already exists
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to <> NEW.assigned_to) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.account_assignments
       WHERE account_id = NEW.id AND user_id = NEW.assigned_to AND end_date IS NULL
    ) THEN
      SELECT id INTO v_profile_id FROM public.profiles WHERE user_id = NEW.assigned_to LIMIT 1;
      INSERT INTO public.account_assignments (account_id, user_id, profile_id, assigned_at, start_date)
      VALUES (NEW.id, NEW.assigned_to, v_profile_id, COALESCE(NEW.assigned_at, now()), current_date);
    END IF;
  END IF;

  RETURN NEW;
END
$fn$;

-- Close assignments when profile is archived (deleted)
CREATE OR REPLACE FUNCTION public.close_assignments_on_profile_archive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_aa RECORD;
BEGIN
  FOR v_aa IN
    SELECT * FROM public.account_assignments
     WHERE (profile_id = OLD.id OR (OLD.user_id IS NOT NULL AND user_id = OLD.user_id))
       AND end_date IS NULL
  LOOP
    UPDATE public.account_assignments
       SET end_date = current_date, unassigned_at = now()
     WHERE id = v_aa.id;

    UPDATE public.accounts
       SET assigned_to = NULL, assigned_at = NULL
     WHERE id = v_aa.account_id
       AND (assigned_to = OLD.user_id OR assigned_to IS NULL);
  END LOOP;
  RETURN OLD;
END
$fn$;

DROP TRIGGER IF EXISTS trg_close_assignments_on_profile_archive ON public.profiles;
CREATE TRIGGER trg_close_assignments_on_profile_archive
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.close_assignments_on_profile_archive();

-- =====================================================================
-- 5. REVENUE READ PATH: open-ended window per assignment
-- =====================================================================
CREATE OR REPLACE FUNCTION public.get_chatter_revenue_series(p_from date, p_to date)
RETURNS TABLE(date date, total numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT ad.date, SUM(ad.total)::numeric AS total
    FROM public.account_assignments aa
    JOIN public.accounts_data ad
      ON ad.account_id = aa.account_id
     AND ad.date >= aa.start_date
     AND ad.date <= COALESCE(aa.end_date, current_date)
   WHERE aa.user_id = auth.uid()
     AND ad.date BETWEEN p_from AND p_to
   GROUP BY ad.date
   ORDER BY ad.date;
$fn$;

-- =====================================================================
-- 6. DROP pre_chatters
-- =====================================================================
DROP TABLE IF EXISTS public.pre_chatters CASCADE;
