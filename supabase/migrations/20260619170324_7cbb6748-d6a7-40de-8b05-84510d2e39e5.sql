
-- 1. Move http extension out of public (drop+recreate; no app code uses public.http wrappers)
DROP EXTENSION IF EXISTS http CASCADE;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 2. Revoke EXECUTE on SECURITY DEFINER trigger/helper functions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
      AND p.proname IN (
        'archive_deleted_record','assign_account_on_offer_update','auto_assign_account',
        'auto_link_sub_admin_account','cascade_delete_model_accounts','claim_pre_chatter',
        'close_assignments_on_profile_archive','decrement_free_count_on_assign',
        'handle_new_user_profile','handle_new_user_progress',
        'pre_archive_account_close_assignments','pre_archive_model_close_assignments',
        'set_accounts_data_model_id','sync_model_active_to_accounts',
        'track_account_assignment','track_fanvue_chatter_assignment',
        'refresh_profiles_data_today','purge_archived_account','purge_archived_model',
        'set_credit_note_seq'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_access_account(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.marketer_can_access_model(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.current_model_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_chatter_real_stats(uuid[], uuid[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_chatter_revenue_series(date, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_credit_note_seq() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_model_revenue(uuid, date, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.next_credit_note_number() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_route_counter() FROM PUBLIC, anon;

-- 3. Tighten always-true policies by scoping to service_role only
DROP POLICY IF EXISTS "Service role full access" ON public.push_subscriptions;
CREATE POLICY "Service role full access" ON public.push_subscriptions
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages notifications" ON public.notifications;
CREATE POLICY "Service role manages notifications" ON public.notifications
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access scheduled notifications" ON public.scheduled_notifications;
CREATE POLICY "Service role full access scheduled notifications" ON public.scheduled_notifications
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access notification_templates" ON public.notification_templates;
CREATE POLICY "Service role full access notification_templates" ON public.notification_templates
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access pending_notifications" ON public.pending_notifications;
CREATE POLICY "Service role full access pending_notifications" ON public.pending_notifications
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access user_roles" ON public.user_roles;
CREATE POLICY "Service role full access user_roles" ON public.user_roles
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access admin notif prefs" ON public.admin_notification_preferences;
CREATE POLICY "Service role full access admin notif prefs" ON public.admin_notification_preferences
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages translation_cache" ON public.translation_cache;
CREATE POLICY "Service role manages translation_cache" ON public.translation_cache
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update counter" ON public.route_counter;
CREATE POLICY "Service role updates counter" ON public.route_counter
  AS PERMISSIVE FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- 4. Restrict mass-dm-media bucket listing (public URLs unaffected)
DROP POLICY IF EXISTS "Public read mass-dm-media" ON storage.objects;
CREATE POLICY "Authenticated read mass-dm-media" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'mass-dm-media');
