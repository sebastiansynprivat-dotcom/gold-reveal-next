
CREATE TABLE public.agency_billing_status (
  agency text PRIMARY KEY,
  in_progress boolean NOT NULL DEFAULT false,
  month int,
  year int,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.agency_billing_status TO authenticated;
GRANT ALL ON public.agency_billing_status TO service_role;
ALTER TABLE public.agency_billing_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view agency billing status"
  ON public.agency_billing_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage agency billing status"
  ON public.agency_billing_status FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
INSERT INTO public.agency_billing_status (agency, in_progress) VALUES ('syn', false), ('shex', false)
  ON CONFLICT (agency) DO NOTHING;
