-- Permitir uso de la app sin login para las tablas principales
-- La app filtra por taller_id desde el cliente; estas políticas desbloquean el acceso anónimo que ahora está devolviendo listas vacías.

DROP POLICY IF EXISTS "clientes anon read" ON public.clientes;
DROP POLICY IF EXISTS "clientes anon insert" ON public.clientes;
DROP POLICY IF EXISTS "clientes anon update" ON public.clientes;
DROP POLICY IF EXISTS "clientes anon delete" ON public.clientes;

CREATE POLICY "clientes anon read"
ON public.clientes
FOR SELECT
TO anon
USING (true);

CREATE POLICY "clientes anon insert"
ON public.clientes
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "clientes anon update"
ON public.clientes
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "clientes anon delete"
ON public.clientes
FOR DELETE
TO anon
USING (true);

DROP POLICY IF EXISTS "gestiones anon read" ON public.gestiones;
DROP POLICY IF EXISTS "gestiones anon insert" ON public.gestiones;
DROP POLICY IF EXISTS "gestiones anon update" ON public.gestiones;
DROP POLICY IF EXISTS "gestiones anon delete" ON public.gestiones;

CREATE POLICY "gestiones anon read"
ON public.gestiones
FOR SELECT
TO anon
USING (true);

CREATE POLICY "gestiones anon insert"
ON public.gestiones
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "gestiones anon update"
ON public.gestiones
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "gestiones anon delete"
ON public.gestiones
FOR DELETE
TO anon
USING (true);

DROP POLICY IF EXISTS "pedidos_pena anon read" ON public.pedidos_pena;
DROP POLICY IF EXISTS "pedidos_pena anon insert" ON public.pedidos_pena;
DROP POLICY IF EXISTS "pedidos_pena anon update" ON public.pedidos_pena;
DROP POLICY IF EXISTS "pedidos_pena anon delete" ON public.pedidos_pena;

CREATE POLICY "pedidos_pena anon read"
ON public.pedidos_pena
FOR SELECT
TO anon
USING (true);

CREATE POLICY "pedidos_pena anon insert"
ON public.pedidos_pena
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "pedidos_pena anon update"
ON public.pedidos_pena
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "pedidos_pena anon delete"
ON public.pedidos_pena
FOR DELETE
TO anon
USING (true);

DROP POLICY IF EXISTS "familias anon read" ON public.familias;
DROP POLICY IF EXISTS "subfamilias anon read" ON public.subfamilias;

CREATE POLICY "familias anon read"
ON public.familias
FOR SELECT
TO anon
USING (true);

CREATE POLICY "subfamilias anon read"
ON public.subfamilias
FOR SELECT
TO anon
USING (true);

-- Permitir subir fotos y audios desde la app sin login.
DROP POLICY IF EXISTS "fotos gestiones anon upload" ON storage.objects;
DROP POLICY IF EXISTS "audios pedidos anon upload" ON storage.objects;
DROP POLICY IF EXISTS "public media anon read" ON storage.objects;

CREATE POLICY "public media anon read"
ON storage.objects
FOR SELECT
TO anon
USING (bucket_id IN ('fotos-gestiones', 'audios-pedidos'));

CREATE POLICY "fotos gestiones anon upload"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'fotos-gestiones');

CREATE POLICY "audios pedidos anon upload"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (bucket_id = 'audios-pedidos');