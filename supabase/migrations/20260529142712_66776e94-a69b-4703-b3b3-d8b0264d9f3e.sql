CREATE TABLE public.platforms (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  color text NOT NULL DEFAULT '#d4af37',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

GRANT SELECT ON public.platforms TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platforms TO authenticated;
GRANT ALL ON public.platforms TO service_role;

ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read platforms"
ON public.platforms FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Anon can read platforms"
ON public.platforms FOR SELECT TO anon
USING (true);

CREATE POLICY "Super admins manage platforms"
ON public.platforms FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_platforms_updated_at
BEFORE UPDATE ON public.platforms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.platforms (key, label, color, sort_order) VALUES
  ('maloum',   'Maloum',   '#d4af37', 10),
  ('brezzels', 'Brezzels', '#3b82f6', 20),
  ('4based',   '4Based',   '#22d3ee', 30),
  ('admireme', 'Admireme', '#ec4899', 40),
  ('visitx',   'VisitX',   '#0ea5e9', 50),
  ('slushy',   'Slushy',   '#8b5cf6', 60)
ON CONFLICT (key) DO NOTHING;