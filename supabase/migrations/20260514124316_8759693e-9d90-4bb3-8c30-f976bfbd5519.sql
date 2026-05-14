DROP FUNCTION IF EXISTS public.sign_in_assembly_by_token(text);

CREATE FUNCTION public.sign_in_assembly_by_token(_qr_token text)
RETURNS TABLE(result text, attendance_status text, assembly_title text, class_slug text, assembly_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _assembly public.assemblies%ROWTYPE;
  _existing public.assembly_attendance%ROWTYPE;
  _user_id uuid := auth.uid();
  _status text;
  _now timestamptz := now();
BEGIN
  IF _user_id IS NULL THEN
    RETURN QUERY SELECT 'auth_required'::text, NULL::text, NULL::text, NULL::text, NULL::uuid;
    RETURN;
  END IF;

  SELECT * INTO _assembly
  FROM public.assemblies
  WHERE qr_token = _qr_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::text, NULL::text, NULL::text, NULL::uuid;
    RETURN;
  END IF;

  IF NOT public.is_keen_member(_assembly.class_slug, _user_id) THEN
    RETURN QUERY SELECT 'not_member'::text, NULL::text, _assembly.title::text, _assembly.class_slug::text, _assembly.id::uuid;
    RETURN;
  END IF;

  IF _now > _assembly.absent_time THEN
    RETURN QUERY SELECT 'expired'::text, 'absent'::text, _assembly.title::text, _assembly.class_slug::text, _assembly.id::uuid;
    RETURN;
  END IF;

  _status := CASE WHEN _now > _assembly.late_time THEN 'late' ELSE 'present' END;

  INSERT INTO public.assembly_attendance (assembly_id, user_id, signed_in_at, status)
  VALUES (_assembly.id, _user_id, _now, _status)
  ON CONFLICT (assembly_id, user_id) DO UPDATE
  SET signed_in_at = CASE
        WHEN public.assembly_attendance.status = 'pending' THEN EXCLUDED.signed_in_at
        ELSE public.assembly_attendance.signed_in_at
      END,
      status = CASE
        WHEN public.assembly_attendance.status = 'pending' THEN EXCLUDED.status
        ELSE public.assembly_attendance.status
      END
  RETURNING * INTO _existing;

  IF _existing.status = _status AND _existing.signed_in_at = _now THEN
    RETURN QUERY SELECT 'signed_in'::text, _existing.status::text, _assembly.title::text, _assembly.class_slug::text, _assembly.id::uuid;
    RETURN;
  END IF;

  IF _existing.status = _status AND _existing.signed_in_at IS NOT NULL THEN
    RETURN QUERY SELECT 'already'::text, _existing.status::text, _assembly.title::text, _assembly.class_slug::text, _assembly.id::uuid;
    RETURN;
  END IF;

  RETURN QUERY SELECT 'already'::text, _existing.status::text, _assembly.title::text, _assembly.class_slug::text, _assembly.id::uuid;
END;
$function$;

REVOKE ALL ON FUNCTION public.sign_in_assembly_by_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sign_in_assembly_by_token(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.sign_in_assembly_by_token(text) TO authenticated;