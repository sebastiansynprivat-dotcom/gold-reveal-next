ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_goal numeric NOT NULL DEFAULT 0;

UPDATE public.profiles p
   SET daily_goal = g.target_amount
  FROM (
    SELECT DISTINCT ON (user_id) user_id, target_amount
      FROM public.daily_goals
     WHERE target_amount IS NOT NULL
     ORDER BY user_id, created_at DESC
  ) g
 WHERE p.user_id = g.user_id;

DROP TABLE IF EXISTS public.daily_goals CASCADE;