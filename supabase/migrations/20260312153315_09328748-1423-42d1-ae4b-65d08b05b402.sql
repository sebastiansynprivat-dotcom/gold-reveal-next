ALTER TABLE public.model_dashboard
ADD COLUMN IF NOT EXISTS yesterday_revenue numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS monthly_revenue numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_revenue numeric DEFAULT 0;