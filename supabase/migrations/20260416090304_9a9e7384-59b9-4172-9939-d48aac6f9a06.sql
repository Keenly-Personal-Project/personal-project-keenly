-- 1. Drop the overly broad assembly SELECT policy
DROP POLICY IF EXISTS "Anyone can read assembly by qr_token for sign-in" ON public.assemblies;

-- 2. Create a secure RPC for QR token lookup (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION public.lookup_assembly_by_token(_qr_token text)
RETURNS TABLE (
  id uuid,
  title text,
  late_time timestamptz,
  absent_time timestamptz,
  class_slug text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.title, a.late_time, a.absent_time, a.class_slug
  FROM public.assemblies a
  WHERE a.qr_token = _qr_token
  LIMIT 1;
$$;

-- 3. Fix meeting-recordings storage: remove broad delete policy
DROP POLICY IF EXISTS "Users can delete own recordings" ON storage.objects;

-- 4. Make meeting-recordings bucket private
UPDATE storage.buckets SET public = false WHERE id = 'meeting-recordings';

-- 5. Remove broad public SELECT policy on meeting-recordings storage
DROP POLICY IF EXISTS "Public can view meeting recording files" ON storage.objects;

-- 6. Add a proper SELECT policy for authenticated users on their own files
CREATE POLICY "Authenticated users can view own meeting recording files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'meeting-recordings' AND auth.uid()::text = (storage.foldername(name))[1]);