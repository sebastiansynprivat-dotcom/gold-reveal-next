
CREATE TABLE public.fanvue_instagram_snapshots (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.fanvue_models(id) on delete cascade,
  followers integer not null check (followers >= 0),
  recorded_at timestamptz not null default now(),
  created_by uuid,
  created_at timestamptz not null default now()
);

CREATE INDEX idx_fanvue_ig_snap_model_time ON public.fanvue_instagram_snapshots(model_id, recorded_at DESC);

ALTER TABLE public.fanvue_instagram_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fanvue: view snapshots"
ON public.fanvue_instagram_snapshots FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR public.has_role(auth.uid(), 'fanvue_partner'::app_role)
);

CREATE POLICY "Fanvue: insert snapshots"
ON public.fanvue_instagram_snapshots FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
  OR public.has_role(auth.uid(), 'fanvue_partner'::app_role)
);

CREATE POLICY "Fanvue: delete snapshots"
ON public.fanvue_instagram_snapshots FOR DELETE
TO authenticated
USING (
  public.is_admin()
  OR public.has_role(auth.uid(), 'fanvue_partner'::app_role)
);
