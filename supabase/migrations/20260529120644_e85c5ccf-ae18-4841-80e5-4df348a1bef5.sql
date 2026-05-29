
CREATE TABLE public.revenue_sale_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform text NOT NULL,
  model text NOT NULL,
  amount numeric NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_revenue_sale_events_recent ON public.revenue_sale_events (platform, model, occurred_at DESC);

GRANT SELECT ON public.revenue_sale_events TO authenticated;
GRANT ALL ON public.revenue_sale_events TO service_role;
ALTER TABLE public.revenue_sale_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can view sale events" ON public.revenue_sale_events FOR SELECT TO authenticated USING (is_admin());

CREATE TABLE public.revenue_surge_log (
  scope text PRIMARY KEY,
  last_sent_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.revenue_surge_log TO authenticated;
GRANT ALL ON public.revenue_surge_log TO service_role;
ALTER TABLE public.revenue_surge_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin can view surge log" ON public.revenue_surge_log FOR SELECT TO authenticated USING (is_admin());
