
CREATE POLICY "gestiones admin select" ON public.gestiones FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "gestiones admin insert" ON public.gestiones FOR INSERT WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "gestiones admin update" ON public.gestiones FOR UPDATE USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "gestiones admin delete" ON public.gestiones FOR DELETE USING (public.is_admin(auth.uid()));
