INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Auth User Update Own Photo" ON storage.objects;
CREATE POLICY "Auth User Update Own Photo"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = 'avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
