
CREATE TABLE public.fanvue_instagram_post_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.fanvue_models(id) ON DELETE CASCADE,
  instagram_url text,
  posts_total integer NOT NULL DEFAULT 0 CHECK (posts_total >= 0),
  posts_7d integer NOT NULL DEFAULT 0 CHECK (posts_7d >= 0),
  posts_30d integer NOT NULL DEFAULT 0 CHECK (posts_30d >= 0),
  last_post_at timestamptz,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX fanvue_ig_post_snap_model_url_idx
  ON public.fanvue_instagram_post_snapshots (model_id, instagram_url, recorded_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fanvue_instagram_post_snapshots TO authenticated;
GRANT ALL ON public.fanvue_instagram_post_snapshots TO service_role;

ALTER TABLE public.fanvue_instagram_post_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fanvue: view post snapshots"
  ON public.fanvue_instagram_post_snapshots FOR SELECT TO authenticated
  USING (is_admin() OR has_role(auth.uid(), 'fanvue_partner'::app_role));

CREATE POLICY "Fanvue: insert post snapshots"
  ON public.fanvue_instagram_post_snapshots FOR INSERT TO authenticated
  WITH CHECK (is_admin() OR has_role(auth.uid(), 'fanvue_partner'::app_role));

CREATE POLICY "Fanvue: delete post snapshots"
  ON public.fanvue_instagram_post_snapshots FOR DELETE TO authenticated
  USING (is_admin() OR has_role(auth.uid(), 'fanvue_partner'::app_role));

CREATE POLICY "Marketers can view assigned model post snapshots"
  ON public.fanvue_instagram_post_snapshots FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'socialmedia_marketer'::app_role) AND marketer_can_access_model(auth.uid(), model_id));
