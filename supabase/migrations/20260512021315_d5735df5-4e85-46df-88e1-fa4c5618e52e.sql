REVOKE ALL ON FUNCTION public.sign_in_assembly_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sign_in_assembly_by_token(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.sign_in_assembly_by_token(text) TO authenticated;