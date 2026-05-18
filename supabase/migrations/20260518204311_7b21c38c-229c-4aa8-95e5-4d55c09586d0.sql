-- 1. Nuevas columnas en pedidos_pena
ALTER TABLE public.pedidos_pena
  ADD COLUMN IF NOT EXISTS audio_url text,
  ADD COLUMN IF NOT EXISTS transcripcion text;

-- 2. Bucket público para audios de pedidos
INSERT INTO storage.buckets (id, name, public)
VALUES ('audios-pedidos', 'audios-pedidos', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas RLS del bucket (lectura/escritura pública, igual que fotos-gestiones)
CREATE POLICY "audios_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'audios-pedidos');

CREATE POLICY "audios_public_write"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'audios-pedidos');

CREATE POLICY "audios_public_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'audios-pedidos');

CREATE POLICY "audios_public_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'audios-pedidos');