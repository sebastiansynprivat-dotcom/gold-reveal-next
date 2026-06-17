
-- Coaching progress per marketer (lesson completions)
CREATE TABLE public.marketer_coaching_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketer_coaching_progress TO authenticated;
GRANT ALL ON public.marketer_coaching_progress TO service_role;

ALTER TABLE public.marketer_coaching_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Marketers manage own coaching progress"
ON public.marketer_coaching_progress
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Daily task tracking
CREATE TABLE public.marketer_daily_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_date date NOT NULL,
  task_key text NOT NULL,
  done boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, task_date, task_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketer_daily_tasks TO authenticated;
GRANT ALL ON public.marketer_daily_tasks TO service_role;

ALTER TABLE public.marketer_daily_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Marketers manage own daily tasks"
ON public.marketer_daily_tasks
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
