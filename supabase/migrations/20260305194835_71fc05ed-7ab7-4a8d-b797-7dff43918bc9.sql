
-- Drop the restrictive SELECT policy and recreate as permissive
DROP POLICY IF EXISTS "Authenticated can view notifications" ON public.notifications;
CREATE POLICY "Authenticated can view notifications"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (true);
