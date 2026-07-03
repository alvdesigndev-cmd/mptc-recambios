
-- Drop all anon policies on business tables
DROP POLICY IF EXISTS "clientes anon read" ON public.clientes;
DROP POLICY IF EXISTS "clientes anon insert" ON public.clientes;
DROP POLICY IF EXISTS "clientes anon update" ON public.clientes;
DROP POLICY IF EXISTS "clientes anon delete" ON public.clientes;
DROP POLICY IF EXISTS "clientes auth all" ON public.clientes;

DROP POLICY IF EXISTS "gestiones anon read" ON public.gestiones;
DROP POLICY IF EXISTS "gestiones anon insert" ON public.gestiones;
DROP POLICY IF EXISTS "gestiones anon update" ON public.gestiones;
DROP POLICY IF EXISTS "gestiones anon delete" ON public.gestiones;
DROP POLICY IF EXISTS "gestiones auth all" ON public.gestiones;

DROP POLICY IF EXISTS "pedidos_pena anon read" ON public.pedidos_pena;
DROP POLICY IF EXISTS "pedidos_pena anon insert" ON public.pedidos_pena;
DROP POLICY IF EXISTS "pedidos_pena anon update" ON public.pedidos_pena;
DROP POLICY IF EXISTS "pedidos_pena anon delete" ON public.pedidos_pena;
DROP POLICY IF EXISTS "pedidos auth all" ON public.pedidos_pena;

DROP POLICY IF EXISTS "familias anon read" ON public.familias;
DROP POLICY IF EXISTS "familias anon insert" ON public.familias;
DROP POLICY IF EXISTS "familias anon update" ON public.familias;
DROP POLICY IF EXISTS "familias anon delete" ON public.familias;
DROP POLICY IF EXISTS "familias auth read" ON public.familias;
DROP POLICY IF EXISTS "familias auth write" ON public.familias;
DROP POLICY IF EXISTS "familias auth update" ON public.familias;
DROP POLICY IF EXISTS "familias auth delete" ON public.familias;

DROP POLICY IF EXISTS "subfamilias anon read" ON public.subfamilias;
DROP POLICY IF EXISTS "subfamilias anon insert" ON public.subfamilias;
DROP POLICY IF EXISTS "subfamilias anon update" ON public.subfamilias;
DROP POLICY IF EXISTS "subfamilias anon delete" ON public.subfamilias;
DROP POLICY IF EXISTS "subfamilias auth read" ON public.subfamilias;
DROP POLICY IF EXISTS "subfamilias auth write" ON public.subfamilias;
DROP POLICY IF EXISTS "subfamilias auth update" ON public.subfamilias;
DROP POLICY IF EXISTS "subfamilias auth delete" ON public.subfamilias;

-- Revoke anon grants on business tables (keep authenticated + service_role)
REVOKE ALL ON public.clientes FROM anon;
REVOKE ALL ON public.gestiones FROM anon;
REVOKE ALL ON public.pedidos_pena FROM anon;
REVOKE ALL ON public.familias FROM anon;
REVOKE ALL ON public.subfamilias FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gestiones TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pedidos_pena TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.familias TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subfamilias TO authenticated;

-- Clientes: scoped to own taller
CREATE POLICY "clientes taller select" ON public.clientes FOR SELECT TO authenticated
  USING (taller_id = public.get_user_taller_id(auth.uid()));
CREATE POLICY "clientes taller insert" ON public.clientes FOR INSERT TO authenticated
  WITH CHECK (taller_id = public.get_user_taller_id(auth.uid()));
CREATE POLICY "clientes taller update" ON public.clientes FOR UPDATE TO authenticated
  USING (taller_id = public.get_user_taller_id(auth.uid()))
  WITH CHECK (taller_id = public.get_user_taller_id(auth.uid()));
CREATE POLICY "clientes taller delete" ON public.clientes FOR DELETE TO authenticated
  USING (taller_id = public.get_user_taller_id(auth.uid()));

-- Gestiones: own taller full access; pena role reads all and can update estado
CREATE POLICY "gestiones taller select" ON public.gestiones FOR SELECT TO authenticated
  USING (
    taller_id = public.get_user_taller_id(auth.uid())
    OR public.is_pena(auth.uid())
  );
CREATE POLICY "gestiones taller insert" ON public.gestiones FOR INSERT TO authenticated
  WITH CHECK (taller_id = public.get_user_taller_id(auth.uid()));
CREATE POLICY "gestiones taller update" ON public.gestiones FOR UPDATE TO authenticated
  USING (
    taller_id = public.get_user_taller_id(auth.uid())
    OR public.is_pena(auth.uid())
  )
  WITH CHECK (
    taller_id = public.get_user_taller_id(auth.uid())
    OR public.is_pena(auth.uid())
  );
CREATE POLICY "gestiones taller delete" ON public.gestiones FOR DELETE TO authenticated
  USING (taller_id = public.get_user_taller_id(auth.uid()));

-- Pedidos_pena: taller sees/writes own; pena sees/updates all
CREATE POLICY "pedidos_pena select" ON public.pedidos_pena FOR SELECT TO authenticated
  USING (
    taller_id = public.get_user_taller_id(auth.uid())
    OR public.is_pena(auth.uid())
  );
CREATE POLICY "pedidos_pena insert" ON public.pedidos_pena FOR INSERT TO authenticated
  WITH CHECK (taller_id = public.get_user_taller_id(auth.uid()));
CREATE POLICY "pedidos_pena update" ON public.pedidos_pena FOR UPDATE TO authenticated
  USING (
    taller_id = public.get_user_taller_id(auth.uid())
    OR public.is_pena(auth.uid())
  )
  WITH CHECK (
    taller_id = public.get_user_taller_id(auth.uid())
    OR public.is_pena(auth.uid())
  );
CREATE POLICY "pedidos_pena delete" ON public.pedidos_pena FOR DELETE TO authenticated
  USING (
    taller_id = public.get_user_taller_id(auth.uid())
    OR public.is_pena(auth.uid())
  );

-- Familias/Subfamilias: read for all auth, write restricted to pena role
CREATE POLICY "familias read" ON public.familias FOR SELECT TO authenticated USING (true);
CREATE POLICY "familias pena insert" ON public.familias FOR INSERT TO authenticated
  WITH CHECK (public.is_pena(auth.uid()));
CREATE POLICY "familias pena update" ON public.familias FOR UPDATE TO authenticated
  USING (public.is_pena(auth.uid())) WITH CHECK (public.is_pena(auth.uid()));
CREATE POLICY "familias pena delete" ON public.familias FOR DELETE TO authenticated
  USING (public.is_pena(auth.uid()));

CREATE POLICY "subfamilias read" ON public.subfamilias FOR SELECT TO authenticated USING (true);
CREATE POLICY "subfamilias pena insert" ON public.subfamilias FOR INSERT TO authenticated
  WITH CHECK (public.is_pena(auth.uid()));
CREATE POLICY "subfamilias pena update" ON public.subfamilias FOR UPDATE TO authenticated
  USING (public.is_pena(auth.uid())) WITH CHECK (public.is_pena(auth.uid()));
CREATE POLICY "subfamilias pena delete" ON public.subfamilias FOR DELETE TO authenticated
  USING (public.is_pena(auth.uid()));

-- Storage: drop anon listing/upload policies. Public buckets still serve files by direct URL.
DROP POLICY IF EXISTS "public media anon read" ON storage.objects;
DROP POLICY IF EXISTS "fotos gestiones anon upload" ON storage.objects;
DROP POLICY IF EXISTS "audios pedidos anon upload" ON storage.objects;
