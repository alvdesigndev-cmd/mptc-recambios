CREATE TABLE public.pedido_mensajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos_pena(id) ON DELETE CASCADE,
  taller_id text,
  autor_rol text NOT NULL CHECK (autor_rol IN ('pena','taller')),
  autor_nombre text NOT NULL DEFAULT '',
  autor_user_id uuid,
  texto text NOT NULL,
  leido_pena boolean NOT NULL DEFAULT false,
  leido_taller boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pedido_mensajes_pedido_idx ON public.pedido_mensajes (pedido_id, created_at);

GRANT SELECT, INSERT, UPDATE ON public.pedido_mensajes TO authenticated;
GRANT ALL ON public.pedido_mensajes TO service_role;

ALTER TABLE public.pedido_mensajes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pedido_mensajes select" ON public.pedido_mensajes
FOR SELECT TO authenticated
USING (
  public.is_pena(auth.uid())
  OR public.is_admin(auth.uid())
  OR taller_id = public.get_user_taller_id(auth.uid())
);

CREATE POLICY "pedido_mensajes insert" ON public.pedido_mensajes
FOR INSERT TO authenticated
WITH CHECK (
  (public.is_pena(auth.uid()) AND autor_rol = 'pena')
  OR (taller_id = public.get_user_taller_id(auth.uid()) AND autor_rol = 'taller')
);

CREATE POLICY "pedido_mensajes update" ON public.pedido_mensajes
FOR UPDATE TO authenticated
USING (
  public.is_pena(auth.uid())
  OR taller_id = public.get_user_taller_id(auth.uid())
)
WITH CHECK (
  public.is_pena(auth.uid())
  OR taller_id = public.get_user_taller_id(auth.uid())
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.pedido_mensajes;