-- Table to control routing after quiz
CREATE TABLE public.quiz_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  target_path text NOT NULL,
  weight integer NOT NULL DEFAULT 50,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_routes ENABLE ROW LEVEL SECURITY;

-- Anyone can read routes (needed for frontend redirect)
CREATE POLICY "Routes are publicly readable"
  ON public.quiz_routes FOR SELECT
  USING (true);

-- Add current_route to user_progress to track which route a user got
ALTER TABLE public.user_progress ADD COLUMN assigned_route text;

-- Insert two default routes (50/50 split)
INSERT INTO public.quiz_routes (name, target_path, weight) VALUES
  ('Route A', '/offer-a', 50),
  ('Route B', '/offer-b', 50);