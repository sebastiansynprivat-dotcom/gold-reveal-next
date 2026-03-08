
-- Add 'model' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'model';

-- Create model_users table
CREATE TABLE public.model_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.model_users ENABLE ROW LEVEL SECURITY;

-- RLS: Models can read own row
CREATE POLICY "Models can view own model_users" ON public.model_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- RLS: Admins full access
CREATE POLICY "Admin full access on model_users" ON public.model_users
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- RLS: Models can view their account
CREATE POLICY "Models can view own account" ON public.accounts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.model_users mu
      WHERE mu.account_id = accounts.id AND mu.user_id = auth.uid()
    )
  );

-- RLS: Models can view revenue of chatters assigned to their account
CREATE POLICY "Models can view assigned chatter revenue" ON public.daily_revenue
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.model_users mu
      JOIN public.account_assignments aa ON aa.account_id = mu.account_id
      WHERE mu.user_id = auth.uid() AND aa.user_id = daily_revenue.user_id
    )
  );

-- RLS: Models can view model_dashboard for their account
CREATE POLICY "Models can view own model_dashboard" ON public.model_dashboard
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.model_users mu
      WHERE mu.account_id = model_dashboard.account_id AND mu.user_id = auth.uid()
    )
  );

-- DB function to get model revenue summary
CREATE OR REPLACE FUNCTION public.get_model_revenue(p_account_id uuid, p_date_from date, p_date_to date)
RETURNS TABLE(total_revenue numeric, chatter_count bigint) 
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT 
    COALESCE(SUM(dr.amount), 0) as total_revenue,
    COUNT(DISTINCT dr.user_id) as chatter_count
  FROM daily_revenue dr
  JOIN account_assignments aa ON aa.user_id = dr.user_id AND aa.account_id = p_account_id
  WHERE dr.date >= p_date_from AND dr.date <= p_date_to;
$$;
