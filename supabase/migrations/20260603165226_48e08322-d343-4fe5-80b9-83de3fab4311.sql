
-- content_drops: ein "neuer Content"-Eintrag pro Upload
CREATE TABLE public.content_drops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  model_name text NOT NULL DEFAULT '',
  content_link text NOT NULL,
  message text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_drops TO authenticated;
GRANT ALL ON public.content_drops TO service_role;

ALTER TABLE public.content_drops ENABLE ROW LEVEL SECURITY;

-- Admins: full access
CREATE POLICY "Admins manage content drops"
  ON public.content_drops FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Chatter: nur Drops sehen, deren Model einem ihrer aktiven Accounts entspricht
CREATE POLICY "Chatters view drops for their models"
  ON public.content_drops FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.assigned_to = auth.uid()
        AND a.model_id = content_drops.model_id
        AND a.model_active = true
    )
  );

CREATE INDEX idx_content_drops_model_id ON public.content_drops(model_id);
CREATE INDEX idx_content_drops_created_at ON public.content_drops(created_at DESC);

-- content_drop_reads: pro (drop, user) max. eine Zeile
CREATE TABLE public.content_drop_reads (
  drop_id uuid NOT NULL REFERENCES public.content_drops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (drop_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.content_drop_reads TO authenticated;
GRANT ALL ON public.content_drop_reads TO service_role;

ALTER TABLE public.content_drop_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reads"
  ON public.content_drop_reads FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all reads"
  ON public.content_drop_reads FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE INDEX idx_content_drop_reads_user ON public.content_drop_reads(user_id);
