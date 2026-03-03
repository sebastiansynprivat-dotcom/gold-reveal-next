
CREATE TABLE public.daily_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  goal_text text NOT NULL,
  target_amount numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
ON public.daily_goals
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage goals"
ON public.daily_goals
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_daily_goals_updated_at
BEFORE UPDATE ON public.daily_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
