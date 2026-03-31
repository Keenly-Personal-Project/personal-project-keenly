
-- Create storage bucket for meeting recordings
INSERT INTO storage.buckets (id, name, public) VALUES ('meeting-recordings', 'meeting-recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to meeting-recordings bucket
CREATE POLICY "Authenticated users can upload recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'meeting-recordings');

-- Allow public read access to recordings
CREATE POLICY "Public read access for recordings"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'meeting-recordings');

-- Allow users to delete their own recordings
CREATE POLICY "Users can delete own recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'meeting-recordings');
