-- Drop broad anon SELECT (which enables bucket listing). Public buckets
-- continue to serve files via the public CDN endpoint without needing
-- a SELECT policy on storage.objects.
DROP POLICY IF EXISTS "fotos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "audios_public_read" ON storage.objects;

CREATE POLICY "fotos auth read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'fotos-gestiones');

CREATE POLICY "audios auth read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'audios-pedidos');