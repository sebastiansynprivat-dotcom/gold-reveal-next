
DROP POLICY IF EXISTS "Anyone can read translation_cache" ON public.translation_cache;
REVOKE SELECT ON public.translation_cache FROM anon;
REVOKE SELECT ON public.translation_cache FROM authenticated;

DROP POLICY IF EXISTS "Authenticated can view notifications" ON public.notifications;
CREATE POLICY "Admins can view notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
