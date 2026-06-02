CREATE TABLE public.payout_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL,
  last_fetched_month smallint NOT NULL CHECK (last_fetched_month BETWEEN 1 AND 12),
  last_fetched_year smallint NOT NULL,
  fourbased_revenue numeric NOT NULL DEFAULT 0,
  maloum_revenue numeric NOT NULL DEFAULT 0,
  brezzels_revenue numeric NOT NULL DEFAULT 0,
  monthly_revenue numeric NOT NULL DEFAULT 0,
  raw_response jsonb,
  last_fetched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payout_revenue_model_month_year_unique UNIQUE (model_id, last_fetched_month, last_fetched_year)
);

CREATE INDEX idx_payout_revenue_model_period ON public.payout_revenue (model_id, last_fetched_year DESC, last_fetched_month DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payout_revenue TO authenticated;
GRANT ALL ON public.payout_revenue TO service_role;

ALTER TABLE public.payout_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on payout_revenue"
ON public.payout_revenue
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Models can view own payout_revenue"
ON public.payout_revenue
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.model_users mu
  WHERE mu.user_id = auth.uid() AND mu.model_id = payout_revenue.model_id
));

CREATE TRIGGER update_payout_revenue_updated_at
BEFORE UPDATE ON public.payout_revenue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();