
-- Model Groups feature
CREATE TABLE public.model_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  default_commission numeric NOT NULL DEFAULT 30,
  referral_source text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#D4AF37',
  notes text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.model_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage all model_groups"
ON public.model_groups FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Sub admins manage own model_groups"
ON public.model_groups FOR ALL TO authenticated
USING (has_role(auth.uid(), 'sub_admin'::app_role) AND created_by = auth.uid())
WITH CHECK (has_role(auth.uid(), 'sub_admin'::app_role) AND created_by = auth.uid());

CREATE POLICY "Admins can read all model_groups"
ON public.model_groups FOR SELECT TO authenticated
USING (is_admin());

CREATE TRIGGER update_model_groups_updated_at
BEFORE UPDATE ON public.model_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend models with group, override, referral source
ALTER TABLE public.models
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.model_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS commission_override numeric,
  ADD COLUMN IF NOT EXISTS referral_source text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_models_group_id ON public.models(group_id);

-- Group billings (consolidated billing snapshots)
CREATE TABLE public.group_billings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.model_groups(id) ON DELETE CASCADE,
  group_name text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_gross numeric NOT NULL DEFAULT 0,
  total_commission numeric NOT NULL DEFAULT 0,
  total_net numeric NOT NULL DEFAULT 0,
  line_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.group_billings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read group_billings"
ON public.group_billings FOR SELECT TO authenticated
USING (is_admin());

CREATE POLICY "Super admins manage group_billings"
ON public.group_billings FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Sub admins manage own group_billings"
ON public.group_billings FOR ALL TO authenticated
USING (has_role(auth.uid(), 'sub_admin'::app_role) AND created_by = auth.uid())
WITH CHECK (has_role(auth.uid(), 'sub_admin'::app_role) AND created_by = auth.uid());
