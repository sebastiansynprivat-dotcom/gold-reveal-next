ALTER TABLE public.revenue_report
ADD CONSTRAINT revenue_report_date_platform_key UNIQUE (date, platform);