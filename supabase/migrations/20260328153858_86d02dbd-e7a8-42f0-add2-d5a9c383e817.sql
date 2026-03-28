CREATE TABLE public.issuer_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Sharify Media Limited',
  address text NOT NULL DEFAULT 'Palaion Patron Germanou 11, 8011, Paphos, Cyprus',
  vat_id text NOT NULL DEFAULT 'CY60329590T',
  kvk text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.issuer_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on issuer_settings"
  ON public.issuer_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO public.issuer_settings (name, address, vat_id, kvk)
VALUES ('Sharify Media Limited', 'Palaion Patron Germanou 11, 8011, Paphos, Cyprus', 'CY60329590T', '');