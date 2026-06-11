
CREATE TABLE IF NOT EXISTS public.marketer_model_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketer_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_id uuid NOT NULL REFERENCES public.fanvue_models(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid,
  UNIQUE(marketer_user_id, model_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketer_model_assignments TO authenticated;
GRANT ALL ON public.marketer_model_assignments TO service_role;

ALTER TABLE public.marketer_model_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Marketers can view own assignments"
  ON public.marketer_model_assignments
  FOR SELECT TO authenticated
  USING (marketer_user_id = auth.uid()
         OR public.has_role(auth.uid(), 'super_admin')
         OR public.has_role(auth.uid(), 'admin')
         OR public.has_role(auth.uid(), 'fanvue_partner'));

CREATE POLICY "Admins manage assignments"
  ON public.marketer_model_assignments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin')
         OR public.has_role(auth.uid(), 'admin')
         OR public.has_role(auth.uid(), 'fanvue_partner'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin')
              OR public.has_role(auth.uid(), 'admin')
              OR public.has_role(auth.uid(), 'fanvue_partner'));

CREATE OR REPLACE FUNCTION public.marketer_can_access_model(_user_id uuid, _model_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.marketer_model_assignments
    WHERE marketer_user_id = _user_id AND model_id = _model_id
  );
$$;

CREATE POLICY "Marketers can view assigned models"
  ON public.fanvue_models
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'socialmedia_marketer')
         AND public.marketer_can_access_model(auth.uid(), id));

CREATE POLICY "Marketers can view assigned model snapshots"
  ON public.fanvue_instagram_snapshots
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'socialmedia_marketer')
         AND public.marketer_can_access_model(auth.uid(), model_id));

CREATE POLICY "Marketers can view content plan assignments for their models"
  ON public.content_plan_assignments
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'socialmedia_marketer')
         AND public.marketer_can_access_model(auth.uid(), model_id));

CREATE POLICY "Marketers can view content plan days for their models"
  ON public.content_plan_days
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'socialmedia_marketer')
         AND EXISTS (
           SELECT 1 FROM public.content_plan_assignments cpa
           WHERE cpa.plan_id = content_plan_days.plan_id
             AND public.marketer_can_access_model(auth.uid(), cpa.model_id)
         ));

CREATE POLICY "Marketers can view content plans for their models"
  ON public.content_plans
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'socialmedia_marketer')
         AND EXISTS (
           SELECT 1 FROM public.content_plan_assignments cpa
           WHERE cpa.plan_id = content_plans.id
             AND public.marketer_can_access_model(auth.uid(), cpa.model_id)
         ));

CREATE POLICY "Marketers can view task status for their models"
  ON public.content_plan_task_status
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'socialmedia_marketer')
         AND EXISTS (
           SELECT 1 FROM public.content_plan_assignments cpa
           WHERE cpa.id = content_plan_task_status.assignment_id
             AND public.marketer_can_access_model(auth.uid(), cpa.model_id)
         ));
