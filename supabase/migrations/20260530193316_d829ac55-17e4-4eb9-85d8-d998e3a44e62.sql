
-- message_reports
CREATE TABLE public.message_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid NOT NULL,
  date date NOT NULL,
  main integer NOT NULL DEFAULT 0,
  follow integer NOT NULL DEFAULT 0,
  total integer GENERATED ALWAYS AS (main + follow) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_reports_account_date_unique UNIQUE (account_id, date)
);
CREATE INDEX idx_message_reports_account_date ON public.message_reports (account_id, date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.message_reports TO authenticated;
GRANT ALL ON public.message_reports TO service_role;

ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage message_reports"
  ON public.message_reports FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Sub admins view assigned message_reports"
  ON public.message_reports FOR SELECT TO authenticated
  USING (can_access_account(auth.uid(), account_id));

CREATE POLICY "Sub admins update assigned message_reports"
  ON public.message_reports FOR UPDATE TO authenticated
  USING (can_access_account(auth.uid(), account_id))
  WITH CHECK (can_access_account(auth.uid(), account_id));

CREATE POLICY "Assigned chatter views own message_reports"
  ON public.message_reports FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = message_reports.account_id AND a.assigned_to = auth.uid()));

CREATE POLICY "Models view own message_reports"
  ON public.message_reports FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.model_users mu
    LEFT JOIN public.accounts a ON a.id = message_reports.account_id
    WHERE mu.user_id = auth.uid()
      AND (mu.account_id = message_reports.account_id
           OR (a.model_id IS NOT NULL AND mu.model_id = a.model_id))
  ));

CREATE TRIGGER update_message_reports_updated_at
  BEFORE UPDATE ON public.message_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- post_reports
CREATE TABLE public.post_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid NOT NULL,
  date date NOT NULL,
  posted integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT post_reports_account_date_unique UNIQUE (account_id, date)
);
CREATE INDEX idx_post_reports_account_date ON public.post_reports (account_id, date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_reports TO authenticated;
GRANT ALL ON public.post_reports TO service_role;

ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage post_reports"
  ON public.post_reports FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Sub admins view assigned post_reports"
  ON public.post_reports FOR SELECT TO authenticated
  USING (can_access_account(auth.uid(), account_id));

CREATE POLICY "Sub admins update assigned post_reports"
  ON public.post_reports FOR UPDATE TO authenticated
  USING (can_access_account(auth.uid(), account_id))
  WITH CHECK (can_access_account(auth.uid(), account_id));

CREATE POLICY "Assigned chatter views own post_reports"
  ON public.post_reports FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = post_reports.account_id AND a.assigned_to = auth.uid()));

CREATE POLICY "Models view own post_reports"
  ON public.post_reports FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.model_users mu
    LEFT JOIN public.accounts a ON a.id = post_reports.account_id
    WHERE mu.user_id = auth.uid()
      AND (mu.account_id = post_reports.account_id
           OR (a.model_id IS NOT NULL AND mu.model_id = a.model_id))
  ));

CREATE TRIGGER update_post_reports_updated_at
  BEFORE UPDATE ON public.post_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
