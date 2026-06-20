
-- ============================================================
-- 1) Marketer-Bewerbungen
-- ============================================================
CREATE TABLE public.socialmedia_marketer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.socialmedia_marketer_applications TO authenticated;
GRANT ALL ON public.socialmedia_marketer_applications TO service_role;

ALTER TABLE public.socialmedia_marketer_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read applications"
  ON public.socialmedia_marketer_applications FOR SELECT
  TO authenticated
  USING (public.is_admin());

CREATE POLICY "Admins insert applications"
  ON public.socialmedia_marketer_applications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins update applications"
  ON public.socialmedia_marketer_applications FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins delete applications"
  ON public.socialmedia_marketer_applications FOR DELETE
  TO authenticated
  USING (public.is_admin());

CREATE TRIGGER trg_smm_apps_updated_at
  BEFORE UPDATE ON public.socialmedia_marketer_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 2) Instagram-Logins auf fanvue_models
-- ============================================================
ALTER TABLE public.fanvue_models
  ADD COLUMN IF NOT EXISTS instagram_logins jsonb NOT NULL DEFAULT '[]'::jsonb;

-- marketers JSONB ist bereits vorhanden — keine Schema-Änderung nötig,
-- ig_username / ig_password werden einfach in das bestehende Marketer-Objekt geschrieben.

-- ============================================================
-- 3) Content-Pläne: Models vs. Marketer
-- ============================================================
ALTER TABLE public.content_plans
  ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'model';

-- Bestehende Pläne explizit auf 'model'
UPDATE public.content_plans SET target_type = 'model' WHERE target_type IS NULL OR target_type = '';

ALTER TABLE public.content_plans
  ADD CONSTRAINT content_plans_target_type_check
  CHECK (target_type IN ('model', 'marketer'));

-- Assignments: optional marketer_user_id, model_id wird nullable
ALTER TABLE public.content_plan_assignments
  ADD COLUMN IF NOT EXISTS marketer_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.content_plan_assignments
  ALTER COLUMN model_id DROP NOT NULL;

ALTER TABLE public.content_plan_assignments
  ADD CONSTRAINT cpa_one_target_chk
  CHECK ((model_id IS NOT NULL)::int + (marketer_user_id IS NOT NULL)::int = 1);

CREATE INDEX IF NOT EXISTS idx_cpa_marketer_user_id
  ON public.content_plan_assignments(marketer_user_id);

-- RLS: Marketer dürfen ihre eigenen Assignments lesen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'content_plan_assignments'
      AND policyname = 'Marketer reads own plan assignments'
  ) THEN
    CREATE POLICY "Marketer reads own plan assignments"
      ON public.content_plan_assignments FOR SELECT
      TO authenticated
      USING (marketer_user_id = auth.uid());
  END IF;
END $$;

-- Marketer dürfen die Plan-Stammdaten lesen, wenn sie mindestens ein Assignment für den Plan haben
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'content_plans'
      AND policyname = 'Marketer reads assigned plans'
  ) THEN
    CREATE POLICY "Marketer reads assigned plans"
      ON public.content_plans FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.content_plan_assignments cpa
          WHERE cpa.plan_id = content_plans.id
            AND cpa.marketer_user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'content_plan_days'
      AND policyname = 'Marketer reads days of assigned plans'
  ) THEN
    CREATE POLICY "Marketer reads days of assigned plans"
      ON public.content_plan_days FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.content_plan_assignments cpa
          WHERE cpa.plan_id = content_plan_days.plan_id
            AND cpa.marketer_user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Marketer dürfen Task-Status für eigene Assignments verwalten
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'content_plan_task_status'
      AND policyname = 'Marketer manages own task status'
  ) THEN
    CREATE POLICY "Marketer manages own task status"
      ON public.content_plan_task_status FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.content_plan_assignments cpa
          WHERE cpa.id = content_plan_task_status.assignment_id
            AND cpa.marketer_user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.content_plan_assignments cpa
          WHERE cpa.id = content_plan_task_status.assignment_id
            AND cpa.marketer_user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'content_plan_week_feedback'
      AND policyname = 'Marketer manages own week feedback'
  ) THEN
    CREATE POLICY "Marketer manages own week feedback"
      ON public.content_plan_week_feedback FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.content_plan_assignments cpa
          WHERE cpa.id = content_plan_week_feedback.assignment_id
            AND cpa.marketer_user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.content_plan_assignments cpa
          WHERE cpa.id = content_plan_week_feedback.assignment_id
            AND cpa.marketer_user_id = auth.uid()
        )
      );
  END IF;
END $$;
