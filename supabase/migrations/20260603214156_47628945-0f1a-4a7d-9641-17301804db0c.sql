
CREATE TABLE IF NOT EXISTS public.fanvue_model_chatter_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.fanvue_models(id) ON DELETE CASCADE,
  chatter_name text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fmca_model_started ON public.fanvue_model_chatter_assignments(model_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_fmca_open ON public.fanvue_model_chatter_assignments(model_id) WHERE ended_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fanvue_model_chatter_assignments TO authenticated;
GRANT ALL ON public.fanvue_model_chatter_assignments TO service_role;

ALTER TABLE public.fanvue_model_chatter_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage fanvue chatter assignments"
ON public.fanvue_model_chatter_assignments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Fanvue partners manage fanvue chatter assignments"
ON public.fanvue_model_chatter_assignments
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'fanvue_partner'::app_role))
WITH CHECK (has_role(auth.uid(), 'fanvue_partner'::app_role));

CREATE OR REPLACE FUNCTION public.track_fanvue_chatter_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old text := COALESCE(NULLIF(trim(OLD.chatter_name), ''), '');
  v_new text := COALESCE(NULLIF(trim(NEW.chatter_name), ''), '');
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF v_new <> '' THEN
      INSERT INTO public.fanvue_model_chatter_assignments(model_id, chatter_name, started_at)
      VALUES (NEW.id, v_new, now());
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE
  IF v_old <> v_new THEN
    -- Close any open assignment
    UPDATE public.fanvue_model_chatter_assignments
       SET ended_at = now()
     WHERE model_id = NEW.id AND ended_at IS NULL;

    -- Open new if a chatter is now set
    IF v_new <> '' THEN
      INSERT INTO public.fanvue_model_chatter_assignments(model_id, chatter_name, started_at)
      VALUES (NEW.id, v_new, now());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_fanvue_chatter_assignment ON public.fanvue_models;
CREATE TRIGGER trg_track_fanvue_chatter_assignment
AFTER INSERT OR UPDATE OF chatter_name ON public.fanvue_models
FOR EACH ROW
EXECUTE FUNCTION public.track_fanvue_chatter_assignment();

-- Backfill: open assignment for any model that currently has a chatter and no history
INSERT INTO public.fanvue_model_chatter_assignments(model_id, chatter_name, started_at)
SELECT m.id, trim(m.chatter_name), COALESCE(m.created_at, now())
FROM public.fanvue_models m
WHERE COALESCE(NULLIF(trim(m.chatter_name), ''), '') <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.fanvue_model_chatter_assignments a
    WHERE a.model_id = m.id
  );
