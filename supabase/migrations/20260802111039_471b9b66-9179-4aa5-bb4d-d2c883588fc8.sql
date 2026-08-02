CREATE POLICY "presupuestos read auth" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'presupuestos');
CREATE POLICY "presupuestos insert auth" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'presupuestos');
CREATE POLICY "presupuestos update auth" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'presupuestos') WITH CHECK (bucket_id = 'presupuestos');
CREATE POLICY "presupuestos delete auth" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'presupuestos');