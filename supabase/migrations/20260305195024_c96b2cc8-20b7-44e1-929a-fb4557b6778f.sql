
CREATE TABLE public.scheduled_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  frequency text NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  send_time time NOT NULL DEFAULT '09:00',
  weekday smallint CHECK (weekday >= 0 AND weekday <= 6),
  day_of_month smallint CHECK (day_of_month >= 1 AND day_of_month <= 28),
  is_active boolean NOT NULL DEFAULT true,
  last_sent_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.scheduled_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage scheduled notifications"
  ON public.scheduled_notifications
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Service role full access scheduled notifications"
  ON public.scheduled_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
