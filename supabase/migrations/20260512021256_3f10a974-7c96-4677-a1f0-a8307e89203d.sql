CREATE OR REPLACE FUNCTION public.sign_in_assembly_by_token(_qr_token text)
RETURNS TABLE(result text, attendance_status text, assembly_title text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _assembly public.assemblies%ROWTYPE;
  _existing public.assembly_attendance%ROWTYPE;
  _user_id uuid := auth.uid();
  _status text;
  _now timestamptz := now();
BEGIN
  IF _user_id IS NULL THEN
    RETURN QUERY SELECT 'auth_required'::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  SELECT * INTO _assembly
  FROM public.assemblies
  WHERE qr_token = _qr_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_found'::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  IF NOT public.is_keen_member(_assembly.class_slug, _user_id) THEN
    RETURN QUERY SELECT 'not_member'::text, NULL::text, _assembly.title::text;
    RETURN;
  END IF;

  IF _now > _assembly.absent_time THEN
    RETURN QUERY SELECT 'expired'::text, 'absent'::text, _assembly.title::text;
    RETURN;
  END IF;

  _status := CASE WHEN _now > _assembly.late_time THEN 'late' ELSE 'present' END;

  SELECT * INTO _existing
  FROM public.assembly_attendance
  WHERE assembly_id = _assembly.id
    AND user_id = _user_id
  LIMIT 1;

  IF FOUND THEN
    IF _existing.status = 'pending' THEN
      UPDATE public.assembly_attendance
      SET signed_in_at = _now, status = _status
      WHERE id = _existing.id;

      RETURN QUERY SELECT 'signed_in'::text, _status::text, _assembly.title::text;
      RETURN;
    END IF;

    RETURN QUERY SELECT 'already'::text, _existing.status::text, _assembly.title::text;
    RETURN;
  END IF;

  INSERT INTO public.assembly_attendance (assembly_id, user_id, signed_in_at, status)
  VALUES (_assembly.id, _user_id, _now, _status);

  RETURN QUERY SELECT 'signed_in'::text, _status::text, _assembly.title::text;
END;
$$;