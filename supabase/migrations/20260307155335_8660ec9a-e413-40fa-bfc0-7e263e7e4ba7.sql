
CREATE TABLE public.pending_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_key text NOT NULL,
  send_at timestamp with time zone NOT NULL,
  sent boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access pending_notifications"
  ON public.pending_notifications FOR ALL
  USING (true) WITH CHECK (true);

CREATE POLICY "Admin can manage pending_notifications"
  ON public.pending_notifications FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE INDEX idx_pending_notifications_send_at ON public.pending_notifications (send_at) WHERE sent = false;
