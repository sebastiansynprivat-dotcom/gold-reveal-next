
-- =========================================
-- marketer_lists
-- =========================================
CREATE TABLE public.marketer_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.fanvue_models(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','done')),
  position int NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketer_lists TO authenticated;
GRANT ALL ON public.marketer_lists TO service_role;

ALTER TABLE public.marketer_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage marketer_lists"
ON public.marketer_lists FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Marketers view assigned model lists"
ON public.marketer_lists FOR SELECT
USING (
  public.has_role(auth.uid(), 'socialmedia_marketer')
  AND public.marketer_can_access_model(auth.uid(), model_id)
);

CREATE INDEX idx_marketer_lists_model_status_pos
  ON public.marketer_lists (model_id, status, position, created_at);

CREATE TRIGGER trg_marketer_lists_updated
  BEFORE UPDATE ON public.marketer_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- marketer_list_items
-- =========================================
CREATE TABLE public.marketer_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.marketer_lists(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  title text NOT NULL,
  reference_url text,
  notes text,
  done boolean NOT NULL DEFAULT false,
  done_by uuid,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketer_list_items TO authenticated;
GRANT ALL ON public.marketer_list_items TO service_role;

ALTER TABLE public.marketer_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage marketer_list_items"
ON public.marketer_list_items FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Marketers view items of assigned lists"
ON public.marketer_list_items FOR SELECT
USING (
  public.has_role(auth.uid(), 'socialmedia_marketer')
  AND EXISTS (
    SELECT 1 FROM public.marketer_lists ml
    WHERE ml.id = list_id
      AND public.marketer_can_access_model(auth.uid(), ml.model_id)
  )
);

CREATE POLICY "Marketers tick items of assigned lists"
ON public.marketer_list_items FOR UPDATE
USING (
  public.has_role(auth.uid(), 'socialmedia_marketer')
  AND EXISTS (
    SELECT 1 FROM public.marketer_lists ml
    WHERE ml.id = list_id
      AND ml.status = 'open'
      AND public.marketer_can_access_model(auth.uid(), ml.model_id)
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'socialmedia_marketer')
  AND EXISTS (
    SELECT 1 FROM public.marketer_lists ml
    WHERE ml.id = list_id
      AND ml.status = 'open'
      AND public.marketer_can_access_model(auth.uid(), ml.model_id)
  )
);

CREATE INDEX idx_marketer_list_items_list_pos
  ON public.marketer_list_items (list_id, position);

CREATE TRIGGER trg_marketer_list_items_updated
  BEFORE UPDATE ON public.marketer_list_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- complete_marketer_list helper
-- =========================================
CREATE OR REPLACE FUNCTION public.complete_marketer_list(p_list_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_model uuid;
  v_open int;
BEGIN
  SELECT model_id INTO v_model FROM public.marketer_lists WHERE id = p_list_id;
  IF v_model IS NULL THEN
    RAISE EXCEPTION 'List not found';
  END IF;

  IF NOT (
    public.is_admin()
    OR (
      public.has_role(auth.uid(), 'socialmedia_marketer')
      AND public.marketer_can_access_model(auth.uid(), v_model)
    )
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT count(*) INTO v_open
    FROM public.marketer_list_items
   WHERE list_id = p_list_id AND done = false;

  IF v_open > 0 AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'still % open items', v_open;
  END IF;

  UPDATE public.marketer_lists
     SET status = 'done', completed_at = now(), updated_at = now()
   WHERE id = p_list_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_marketer_list(uuid) TO authenticated;
