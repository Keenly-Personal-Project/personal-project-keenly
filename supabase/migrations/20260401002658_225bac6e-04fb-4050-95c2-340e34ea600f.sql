CREATE TABLE IF NOT EXISTS public.meeting_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  class_name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL,
  media_name TEXT NOT NULL DEFAULT '',
  duration INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meeting_recordings_class_name ON public.meeting_recordings (class_name);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_user_id ON public.meeting_recordings (user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_created_at ON public.meeting_recordings (created_at DESC);

ALTER TABLE public.meeting_recordings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view meeting recordings" ON public.meeting_recordings;
DROP POLICY IF EXISTS "Users can create meeting recordings" ON public.meeting_recordings;
DROP POLICY IF EXISTS "Users can update their own meeting recordings" ON public.meeting_recordings;
DROP POLICY IF EXISTS "Users can delete their own meeting recordings" ON public.meeting_recordings;

CREATE POLICY "Users can view meeting recordings"
ON public.meeting_recordings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create meeting recordings"
ON public.meeting_recordings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own meeting recordings"
ON public.meeting_recordings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own meeting recordings"
ON public.meeting_recordings
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_meeting_recordings_updated_at ON public.meeting_recordings;
CREATE TRIGGER update_meeting_recordings_updated_at
BEFORE UPDATE ON public.meeting_recordings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-recordings', 'meeting-recordings', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view meeting recording files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload own meeting recording files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete own meeting recording files" ON storage.objects;

CREATE POLICY "Public can view meeting recording files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'meeting-recordings');

CREATE POLICY "Authenticated users can upload own meeting recording files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'meeting-recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Authenticated users can delete own meeting recording files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'meeting-recordings'
  AND (storage.foldername(name))[1] = auth.uid()::text
);