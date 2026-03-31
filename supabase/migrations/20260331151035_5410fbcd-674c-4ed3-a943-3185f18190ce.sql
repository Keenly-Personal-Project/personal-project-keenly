
CREATE POLICY "Upload recording files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'recordings');

CREATE POLICY "View recording files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'recordings');

CREATE POLICY "Delete own recording files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'recordings' AND (storage.foldername(name))[1] = auth.uid()::text);
