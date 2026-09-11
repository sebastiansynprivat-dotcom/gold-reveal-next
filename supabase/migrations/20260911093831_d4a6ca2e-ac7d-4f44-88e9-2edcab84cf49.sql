DELETE FROM public.platforms WHERE lower(key) IN ('visitx','visit-x','fansyme','fansy');
DELETE FROM public.quiz_routes WHERE lower(name) IN ('fansyme','visitx','visit-x') OR target_path = '/offer-c';