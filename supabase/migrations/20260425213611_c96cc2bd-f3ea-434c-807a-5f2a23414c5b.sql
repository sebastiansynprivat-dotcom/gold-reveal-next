ALTER TABLE public.revenue_report REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.revenue_report;