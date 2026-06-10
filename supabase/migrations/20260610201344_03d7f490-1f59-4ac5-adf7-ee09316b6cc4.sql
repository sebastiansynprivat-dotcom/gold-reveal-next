REVOKE EXECUTE ON FUNCTION public.current_model_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_model_id() TO authenticated, service_role;