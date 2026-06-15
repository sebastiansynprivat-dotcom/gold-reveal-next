
CREATE TABLE public.content_plan_week_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.content_plan_assignments(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  feedback text DEFAULT '',
  folder_url text DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, week_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_plan_week_feedback TO authenticated;
GRANT ALL ON public.content_plan_week_feedback TO service_role;

ALTER TABLE public.content_plan_week_feedback ENABLE ROW LEVEL SECURITY;

-- Models can read/write feedback for their own assignments
CREATE POLICY "Models manage own week feedback"
ON public.content_plan_week_feedback
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.content_plan_assignments a
    JOIN public.fanvue_model_users mu ON mu.model_id = a.model_id
    WHERE a.id = content_plan_week_feedback.assignment_id
      AND mu.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.content_plan_assignments a
    JOIN public.fanvue_model_users mu ON mu.model_id = a.model_id
    WHERE a.id = content_plan_week_feedback.assignment_id
      AND mu.user_id = auth.uid()
  )
);

-- Admins full access
CREATE POLICY "Admins manage all week feedback"
ON public.content_plan_week_feedback
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE TRIGGER update_content_plan_week_feedback_updated_at
BEFORE UPDATE ON public.content_plan_week_feedback
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
