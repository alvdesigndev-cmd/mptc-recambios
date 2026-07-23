
DROP POLICY IF EXISTS "familias pena insert" ON public.familias;
DROP POLICY IF EXISTS "familias pena update" ON public.familias;
DROP POLICY IF EXISTS "familias pena delete" ON public.familias;
DROP POLICY IF EXISTS "subfamilias pena insert" ON public.subfamilias;
DROP POLICY IF EXISTS "subfamilias pena update" ON public.subfamilias;
DROP POLICY IF EXISTS "subfamilias pena delete" ON public.subfamilias;

CREATE POLICY "familias pena/admin insert" ON public.familias FOR INSERT TO authenticated WITH CHECK (public.is_pena(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "familias pena/admin update" ON public.familias FOR UPDATE TO authenticated USING (public.is_pena(auth.uid()) OR public.is_admin(auth.uid())) WITH CHECK (public.is_pena(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "familias pena/admin delete" ON public.familias FOR DELETE TO authenticated USING (public.is_pena(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "subfamilias pena/admin insert" ON public.subfamilias FOR INSERT TO authenticated WITH CHECK (public.is_pena(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "subfamilias pena/admin update" ON public.subfamilias FOR UPDATE TO authenticated USING (public.is_pena(auth.uid()) OR public.is_admin(auth.uid())) WITH CHECK (public.is_pena(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "subfamilias pena/admin delete" ON public.subfamilias FOR DELETE TO authenticated USING (public.is_pena(auth.uid()) OR public.is_admin(auth.uid()));
