
-- 1. Fix pending_notifications: change service role policy from {public} to {service_role}
DROP POLICY IF EXISTS "Service role full access pending_notifications" ON public.pending_notifications;
CREATE POLICY "Service role full access pending_notifications"
  ON public.pending_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Fix admin_totp_secrets: restrict ALL policy to super_admin only, sub_admins keep own-row SELECT
DROP POLICY IF EXISTS "Admins can manage totp secrets" ON public.admin_totp_secrets;
CREATE POLICY "Super admins can manage totp secrets"
  ON public.admin_totp_secrets
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Sub admins can manage own totp secrets"
  ON public.admin_totp_secrets
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'sub_admin') AND user_id = auth.uid())
  WITH CHECK (has_role(auth.uid(), 'sub_admin') AND user_id = auth.uid());

-- 3. Fix route_counter: remove anon update policy, restrict to authenticated only
DROP POLICY IF EXISTS "Anon can update counter" ON public.route_counter;
