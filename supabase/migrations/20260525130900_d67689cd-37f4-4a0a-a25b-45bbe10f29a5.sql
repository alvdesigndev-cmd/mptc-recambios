-- Tighten table RLS: drop overly permissive policies and require auth
DROP POLICY IF EXISTS "clientes all anon" ON public.clientes;
CREATE POLICY "clientes auth all" ON public.clientes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "gestiones all anon" ON public.gestiones;
CREATE POLICY "gestiones auth all" ON public.gestiones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "familias all anon" ON public.familias;
CREATE POLICY "familias auth read" ON public.familias
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "familias auth write" ON public.familias
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "familias auth update" ON public.familias
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "familias auth delete" ON public.familias
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "subfamilias all anon" ON public.subfamilias;
CREATE POLICY "subfamilias auth read" ON public.subfamilias
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "subfamilias auth write" ON public.subfamilias
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "subfamilias auth update" ON public.subfamilias
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "subfamilias auth delete" ON public.subfamilias
  FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "pedidos all anon" ON public.pedidos_pena;
CREATE POLICY "pedidos auth all" ON public.pedidos_pena
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tighten storage: keep public SELECT (CDN access for <img>) but restrict writes to authenticated users.
DROP POLICY IF EXISTS "fotos_public_write" ON storage.objects;
DROP POLICY IF EXISTS "fotos_public_update" ON storage.objects;
DROP POLICY IF EXISTS "fotos_public_delete" ON storage.objects;
CREATE POLICY "fotos auth write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fotos-gestiones');
CREATE POLICY "fotos auth update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'fotos-gestiones')
  WITH CHECK (bucket_id = 'fotos-gestiones');
CREATE POLICY "fotos auth delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'fotos-gestiones');

DROP POLICY IF EXISTS "audios_public_write" ON storage.objects;
DROP POLICY IF EXISTS "audios_public_update" ON storage.objects;
DROP POLICY IF EXISTS "audios_public_delete" ON storage.objects;
CREATE POLICY "audios auth write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audios-pedidos');
CREATE POLICY "audios auth update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'audios-pedidos')
  WITH CHECK (bucket_id = 'audios-pedidos');
CREATE POLICY "audios auth delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'audios-pedidos');

-- Lock down SECURITY DEFINER helpers so only the public confirm/reject RPCs
-- are callable by anon. Internal helpers should not be callable from the API.
REVOKE EXECUTE ON FUNCTION public.is_pena(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_user_taller_id(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated, public;