CREATE TABLE public.admin_notification_preferences (
  user_id uuid NOT NULL PRIMARY KEY,
  new_request boolean NOT NULL DEFAULT true,
  new_revenue boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_notification_preferences TO authenticated;
GRANT ALL ON public.admin_notification_preferences TO service_role;

ALTER TABLE public.admin_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own admin notification prefs"
ON public.admin_notification_preferences
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access admin notif prefs"
ON public.admin_notification_preferences
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE TRIGGER set_admin_notification_preferences_updated_at
BEFORE UPDATE ON public.admin_notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();