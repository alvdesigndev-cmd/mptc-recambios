
-- Permitir acceso anónimo mientras auth está desactivado
DROP POLICY IF EXISTS "gestiones insert" ON public.gestiones;
DROP POLICY IF EXISTS "gestiones select" ON public.gestiones;
DROP POLICY IF EXISTS "gestiones update" ON public.gestiones;
DROP POLICY IF EXISTS "gestiones delete" ON public.gestiones;

CREATE POLICY "gestiones all anon" ON public.gestiones FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "clientes select" ON public.clientes;
DROP POLICY IF EXISTS "clientes write" ON public.clientes;
DROP POLICY IF EXISTS "clientes update" ON public.clientes;
DROP POLICY IF EXISTS "clientes delete" ON public.clientes;

CREATE POLICY "clientes all anon" ON public.clientes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "pedidos insert" ON public.pedidos_pena;
DROP POLICY IF EXISTS "pedidos select" ON public.pedidos_pena;
DROP POLICY IF EXISTS "pedidos update" ON public.pedidos_pena;

CREATE POLICY "pedidos all anon" ON public.pedidos_pena FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
