
CREATE POLICY "familias anon insert" ON public.familias FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "familias anon update" ON public.familias FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "familias anon delete" ON public.familias FOR DELETE TO anon USING (true);

CREATE POLICY "subfamilias anon insert" ON public.subfamilias FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "subfamilias anon update" ON public.subfamilias FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "subfamilias anon delete" ON public.subfamilias FOR DELETE TO anon USING (true);
