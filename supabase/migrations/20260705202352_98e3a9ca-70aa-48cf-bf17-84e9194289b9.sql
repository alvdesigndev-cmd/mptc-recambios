GRANT SELECT ON public.talleres TO anon;
CREATE POLICY talleres_select_anon_active ON public.talleres FOR SELECT TO anon USING (activo = true);