ALTER TABLE public.daily_revenue
ADD CONSTRAINT daily_revenue_user_date_unique UNIQUE (user_id, date);