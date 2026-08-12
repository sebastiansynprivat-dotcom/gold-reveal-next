REVOKE EXECUTE ON FUNCTION public.get_brezzels_comment_targets_by_account(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_brezzels_comment_targets_by_account(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_brezzels_comment_targets_by_account(integer) TO service_role;