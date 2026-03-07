
CREATE TABLE public.notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL UNIQUE,
  label text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage notification_templates" ON public.notification_templates
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Service role full access notification_templates" ON public.notification_templates
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO public.notification_templates (template_key, label, title, body) VALUES
  ('account_assigned', 'Account zugewiesen', 'Gute Nachrichten 🥳', 'Dir wurde ein neuer Account zugewiesen! Schau jetzt in dein Dashboard.');
