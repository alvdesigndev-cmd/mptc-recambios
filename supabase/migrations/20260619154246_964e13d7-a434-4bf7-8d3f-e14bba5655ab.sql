ALTER TABLE public.gestiones
  ADD COLUMN IF NOT EXISTS vin text,
  ADD COLUMN IF NOT EXISTS marca text,
  ADD COLUMN IF NOT EXISTS modelo text,
  ADD COLUMN IF NOT EXISTS motor text,
  ADD COLUMN IF NOT EXISTS fecha_matriculacion text;

GRANT SELECT, INSERT, UPDATE ON public.gestiones TO authenticated;
GRANT ALL ON public.gestiones TO service_role;