
-- Counter for deterministic round-robin routing
CREATE TABLE public.route_counter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counter integer NOT NULL DEFAULT 0
);

-- Insert single row
INSERT INTO public.route_counter (counter) VALUES (0);

-- Allow public read + authenticated increment
ALTER TABLE public.route_counter ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read counter" ON public.route_counter FOR SELECT USING (true);
CREATE POLICY "Authenticated can update counter" ON public.route_counter FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon can update counter" ON public.route_counter FOR UPDATE TO anon USING (true) WITH CHECK (true);
