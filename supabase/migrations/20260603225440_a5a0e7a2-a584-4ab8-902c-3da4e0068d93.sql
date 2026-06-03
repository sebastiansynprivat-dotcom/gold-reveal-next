
CREATE TABLE public.accounts_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  date date NOT NULL,
  platform text NOT NULL,
  total numeric NOT NULL DEFAULT 0,
  amounts jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, date, platform)
);

CREATE INDEX accounts_revenue_account_date_idx
  ON public.accounts_revenue (account_id, date DESC);

GRANT SELECT ON public.accounts_revenue TO authenticated;
GRANT ALL ON public.accounts_revenue TO service_role;

ALTER TABLE public.accounts_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins full access on accounts_revenue"
  ON public.accounts_revenue
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can view accounts_revenue"
  ON public.accounts_revenue
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Models can view their accounts_revenue"
  ON public.accounts_revenue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.model_users mu
      JOIN public.accounts a ON a.model_id = mu.model_id
      WHERE mu.user_id = auth.uid()
        AND a.id = accounts_revenue.account_id
    )
  );

CREATE POLICY "Chatters can view assigned accounts_revenue"
  ON public.accounts_revenue
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = accounts_revenue.account_id
        AND a.assigned_to = auth.uid()
    )
  );

CREATE TRIGGER accounts_revenue_set_updated_at
  BEFORE UPDATE ON public.accounts_revenue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
