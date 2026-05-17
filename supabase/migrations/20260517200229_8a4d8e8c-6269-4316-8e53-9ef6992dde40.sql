CREATE TABLE public.familias (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  nombre text NOT NULL,
  icono text NOT NULL DEFAULT '🔧',
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.subfamilias (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  familia_id uuid NOT NULL REFERENCES public.familias(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  nombre text NOT NULL,
  mensaje text NOT NULL DEFAULT '',
  orden integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subfamilias_familia ON public.subfamilias(familia_id);

ALTER TABLE public.familias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subfamilias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "familias all anon" ON public.familias FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "subfamilias all anon" ON public.subfamilias FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_familias_touch BEFORE UPDATE ON public.familias FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_subfamilias_touch BEFORE UPDATE ON public.subfamilias FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();