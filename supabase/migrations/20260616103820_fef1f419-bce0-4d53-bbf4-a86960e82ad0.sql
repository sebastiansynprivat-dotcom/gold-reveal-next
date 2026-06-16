-- =====================================================================
-- 1) Existierende Duplikate aufräumen:
--    Für jede Telegram-ID mit mehreren Profilen: behalte das mit user_id
--    (bzw. das älteste), übertrage Assignments und lösche den Rest.
-- =====================================================================
DO $cleanup$
DECLARE
  v_tg text;
  v_keep_id uuid;
  v_dup RECORD;
BEGIN
  FOR v_tg IN
    SELECT lower(regexp_replace(telegram_id,'^@',''))
      FROM public.profiles
     WHERE telegram_id IS NOT NULL AND telegram_id <> ''
     GROUP BY 1
    HAVING count(*) > 1
  LOOP
    -- Bevorzugt das Profil mit user_id (echter Account), sonst ältestes
    SELECT id INTO v_keep_id
      FROM public.profiles
     WHERE lower(regexp_replace(telegram_id,'^@','')) = v_tg
     ORDER BY (user_id IS NOT NULL) DESC, pre_create ASC, created_at ASC
     LIMIT 1;

    FOR v_dup IN
      SELECT id, user_id
        FROM public.profiles
       WHERE lower(regexp_replace(telegram_id,'^@','')) = v_tg
         AND id <> v_keep_id
    LOOP
      -- Offene Assignments auf das Keep-Profil umhängen
      UPDATE public.account_assignments aa
         SET profile_id = v_keep_id,
             user_id = COALESCE(
               (SELECT user_id FROM public.profiles WHERE id = v_keep_id),
               aa.user_id
             )
       WHERE aa.profile_id = v_dup.id;

      -- accounts.assigned_to angleichen, falls leer
      UPDATE public.accounts a
         SET assigned_to = (SELECT user_id FROM public.profiles WHERE id = v_keep_id),
             assigned_at = COALESCE(a.assigned_at, now())
       WHERE a.id IN (SELECT account_id FROM public.account_assignments WHERE profile_id = v_keep_id AND end_date IS NULL)
         AND a.assigned_to IS NULL
         AND (SELECT user_id FROM public.profiles WHERE id = v_keep_id) IS NOT NULL;

      -- Duplikat löschen
      DELETE FROM public.profiles WHERE id = v_dup.id;
    END LOOP;
  END LOOP;
END
$cleanup$;

-- =====================================================================
-- 2) Globaler Unique-Index auf normalisierte Telegram-ID
-- =====================================================================
DROP INDEX IF EXISTS public.profiles_pre_create_telegram_unique;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_telegram_id_unique
  ON public.profiles (lower(regexp_replace(telegram_id, '^@', '')))
  WHERE telegram_id IS NOT NULL AND telegram_id <> '';

-- =====================================================================
-- 3) Trigger: greift jetzt auch bei pre_create=true,
--    räumt JEDES andere Profil mit gleicher Telegram-ID auf
-- =====================================================================
CREATE OR REPLACE FUNCTION public.claim_pre_chatter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_norm text;
  v_dup RECORD;
  v_aa RECORD;
BEGIN
  IF NEW.telegram_id IS NULL OR NEW.telegram_id = '' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND COALESCE(OLD.telegram_id, '') = COALESCE(NEW.telegram_id, '') THEN
    RETURN NEW;
  END IF;

  v_norm := lower(regexp_replace(NEW.telegram_id, '^@', ''));

  FOR v_dup IN
    SELECT * FROM public.profiles
     WHERE id <> NEW.id
       AND lower(regexp_replace(telegram_id, '^@', '')) = v_norm
     ORDER BY pre_create DESC, created_at ASC
  LOOP
    -- Falls NEW ein neuer Pre-Create ist und schon ein echter Chatter existiert:
    -- verweigern (verhindert das versehentliche Doppelanlegen).
    IF NEW.pre_create = true AND v_dup.user_id IS NOT NULL THEN
      RAISE EXCEPTION 'Es existiert bereits ein registrierter Chatter mit dieser Telegram-ID (%).', NEW.telegram_id
        USING ERRCODE = 'unique_violation';
    END IF;

    -- Felder übernehmen, wenn NEW leer ist
    IF (NEW.group_name IS NULL OR NEW.group_name = '') AND v_dup.group_name IS NOT NULL AND v_dup.group_name <> '' THEN
      NEW.group_name := v_dup.group_name;
    END IF;
    IF (NEW.name IS NULL OR NEW.name = '') AND v_dup.name IS NOT NULL AND v_dup.name <> '' THEN
      NEW.name := v_dup.name;
    END IF;
    IF v_dup.language IS NOT NULL AND (NEW.language IS NULL OR NEW.language = '') THEN
      NEW.language := v_dup.language;
      NEW.ui_language := v_dup.language;
    END IF;

    -- Offene Assignments übertragen
    FOR v_aa IN
      SELECT * FROM public.account_assignments
       WHERE profile_id = v_dup.id AND end_date IS NULL
    LOOP
      UPDATE public.account_assignments
         SET user_id = COALESCE(NEW.user_id, user_id),
             profile_id = NEW.id
       WHERE id = v_aa.id;

      IF NEW.user_id IS NOT NULL THEN
        UPDATE public.accounts
           SET assigned_to = NEW.user_id,
               assigned_at = COALESCE(assigned_at, now())
         WHERE id = v_aa.account_id AND assigned_to IS NULL;
      END IF;
    END LOOP;

    -- Duplikat löschen
    DELETE FROM public.profiles WHERE id = v_dup.id;
  END LOOP;

  RETURN NEW;
END
$fn$;
