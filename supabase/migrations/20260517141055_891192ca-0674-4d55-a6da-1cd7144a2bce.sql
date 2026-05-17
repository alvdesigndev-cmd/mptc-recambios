
-- Tablas principales
CREATE TABLE public.gestiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_nombre TEXT,
  taller_id TEXT,
  cliente_nombre TEXT,
  cliente_telefono TEXT,
  matricula TEXT,
  vehiculo TEXT,
  km TEXT,
  categoria TEXT,
  subfamilia TEXT,
  objecion TEXT,
  descripcion TEXT,
  piezas TEXT,
  importe TEXT,
  estado TEXT NOT NULL DEFAULT 'en-curso',
  pedido_pena BOOLEAN NOT NULL DEFAULT false,
  fotos TEXT[] DEFAULT '{}',
  confirm_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX gestiones_taller_id_idx ON public.gestiones(taller_id);
CREATE INDEX gestiones_confirm_token_idx ON public.gestiones(confirm_token);
CREATE INDEX gestiones_pedido_pena_idx ON public.gestiones(pedido_pena);

CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id TEXT,
  taller_nombre TEXT,
  nombre TEXT,
  telefono TEXT,
  matricula TEXT,
  vehiculo TEXT,
  km TEXT,
  notas TEXT,
  total_gestiones INT NOT NULL DEFAULT 0,
  ultima_gestion TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX clientes_taller_id_idx ON public.clientes(taller_id);
CREATE INDEX clientes_nombre_idx ON public.clientes(taller_id, nombre);

CREATE TABLE public.pedidos_pena (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taller_id TEXT,
  taller_nombre TEXT,
  matricula TEXT,
  vehiculo TEXT,
  piezas TEXT,
  notas TEXT,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  pedido_numero INT,
  fotos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS abierta (Fase 1 - será reemplazada por auth por taller en Fase 5)
ALTER TABLE public.gestiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos_pena ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_gestiones" ON public.gestiones FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_clientes" ON public.clientes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_pedidos_pena" ON public.pedidos_pena FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Bucket de fotos
INSERT INTO storage.buckets (id, name, public) VALUES ('fotos-gestiones', 'fotos-gestiones', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "fotos_public_read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'fotos-gestiones');
CREATE POLICY "fotos_public_write" ON storage.objects FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'fotos-gestiones');
CREATE POLICY "fotos_public_update" ON storage.objects FOR UPDATE TO anon, authenticated USING (bucket_id = 'fotos-gestiones');
CREATE POLICY "fotos_public_delete" ON storage.objects FOR DELETE TO anon, authenticated USING (bucket_id = 'fotos-gestiones');
