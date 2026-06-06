
CREATE TABLE public.bot_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  account_email text,
  platform text NOT NULL,
  date date NOT NULL DEFAULT current_date,
  type text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX bot_notifications_type_idx ON public.bot_notifications(type);
CREATE INDEX bot_notifications_date_idx ON public.bot_notifications(date DESC);
CREATE INDEX bot_notifications_account_idx ON public.bot_notifications(account_id);

GRANT SELECT, DELETE ON public.bot_notifications TO authenticated;
GRANT ALL ON public.bot_notifications TO service_role;

ALTER TABLE public.bot_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view bot notifications"
  ON public.bot_notifications FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins can delete bot notifications"
  ON public.bot_notifications FOR DELETE
  TO authenticated
  USING (public.is_admin());

ALTER TABLE public.bot_notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bot_notifications;
