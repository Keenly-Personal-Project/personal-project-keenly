-- Create storage bucket for note attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('note-attachments', 'note-attachments', true, 104857600);

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload note attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'note-attachments');

-- Allow public read access
CREATE POLICY "Public read access for note attachments"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'note-attachments');

-- Allow authenticated users to delete own uploads
CREATE POLICY "Authenticated users can delete own note attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'note-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);