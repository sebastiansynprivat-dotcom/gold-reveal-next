
-- Table to store daily revenue entries per user
CREATE TABLE public.daily_revenue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE public.daily_revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own revenue"
ON public.daily_revenue FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own revenue"
ON public.daily_revenue FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own revenue"
ON public.daily_revenue FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admin can view all revenue"
ON public.daily_revenue FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Admin can manage all revenue"
ON public.daily_revenue FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE TRIGGER update_daily_revenue_updated_at
BEFORE UPDATE ON public.daily_revenue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
