
-- Tables first (no policies yet to avoid forward references)
CREATE TABLE public.content_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.content_plan_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.content_plans(id) ON DELETE CASCADE,
  day_number int NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id, day_number)
);

CREATE TABLE public.content_plan_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.content_plans(id) ON DELETE CASCADE,
  model_id uuid NOT NULL REFERENCES public.fanvue_models(id) ON DELETE CASCADE,
  start_date date NOT NULL DEFAULT (date_trunc('week', now())::date),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(plan_id, model_id)
);

CREATE TABLE public.content_plan_task_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.content_plan_assignments(id) ON DELETE CASCADE,
  day_number int NOT NULL,
  item_index int NOT NULL,
  done boolean NOT NULL DEFAULT false,
  upload_url text DEFAULT '',
  note text DEFAULT '',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, day_number, item_index)
);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_plans TO authenticated;
GRANT ALL ON public.content_plans TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_plan_days TO authenticated;
GRANT ALL ON public.content_plan_days TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_plan_assignments TO authenticated;
GRANT ALL ON public.content_plan_assignments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_plan_task_status TO authenticated;
GRANT ALL ON public.content_plan_task_status TO service_role;

-- RLS
ALTER TABLE public.content_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_plan_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_plan_task_status ENABLE ROW LEVEL SECURITY;

-- Policies: content_plans
CREATE POLICY "Admins manage plans" ON public.content_plans
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Models read assigned plans" ON public.content_plans
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.content_plan_assignments a
      JOIN public.fanvue_model_users mu ON mu.model_id = a.model_id
      WHERE a.plan_id = content_plans.id AND mu.user_id = auth.uid())
  );

-- Policies: content_plan_days
CREATE POLICY "Admins manage days" ON public.content_plan_days
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Models read days of assigned plans" ON public.content_plan_days
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.content_plan_assignments a
      JOIN public.fanvue_model_users mu ON mu.model_id = a.model_id
      WHERE a.plan_id = content_plan_days.plan_id AND mu.user_id = auth.uid())
  );

-- Policies: content_plan_assignments
CREATE POLICY "Admins manage assignments" ON public.content_plan_assignments
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Models read own assignments" ON public.content_plan_assignments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.fanvue_model_users mu
      WHERE mu.model_id = content_plan_assignments.model_id AND mu.user_id = auth.uid())
  );

-- Policies: content_plan_task_status
CREATE POLICY "Admins manage task status" ON public.content_plan_task_status
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Models read own task status" ON public.content_plan_task_status
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.content_plan_assignments a
      JOIN public.fanvue_model_users mu ON mu.model_id = a.model_id
      WHERE a.id = content_plan_task_status.assignment_id AND mu.user_id = auth.uid())
  );
CREATE POLICY "Models insert own task status" ON public.content_plan_task_status
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.content_plan_assignments a
      JOIN public.fanvue_model_users mu ON mu.model_id = a.model_id
      WHERE a.id = content_plan_task_status.assignment_id AND mu.user_id = auth.uid())
  );
CREATE POLICY "Models update own task status" ON public.content_plan_task_status
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.content_plan_assignments a
      JOIN public.fanvue_model_users mu ON mu.model_id = a.model_id
      WHERE a.id = content_plan_task_status.assignment_id AND mu.user_id = auth.uid())
  );

-- Triggers
CREATE TRIGGER tg_content_plans_updated BEFORE UPDATE ON public.content_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tg_content_plan_days_updated BEFORE UPDATE ON public.content_plan_days
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tg_content_plan_task_status_updated BEFORE UPDATE ON public.content_plan_task_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
