ALTER TABLE public.pedidos_pena
  ADD COLUMN IF NOT EXISTS cliente_nombre text,
  ADD COLUMN IF NOT EXISTS cliente_telefono text,
  ADD COLUMN IF NOT EXISTS marca text,
  ADD COLUMN IF NOT EXISTS modelo text,
  ADD COLUMN IF NOT EXISTS motor text,
  ADD COLUMN IF NOT EXISTS piezas_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS importe_total numeric(10,2),
  ADD COLUMN IF NOT EXISTS numero_pedido text;