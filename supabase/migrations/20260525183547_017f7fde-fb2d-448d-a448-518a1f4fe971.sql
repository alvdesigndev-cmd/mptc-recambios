-- Add confirmation token to pedidos_pena for state changes via shared link
ALTER TABLE public.pedidos_pena ADD COLUMN IF NOT EXISTS confirm_token text UNIQUE;

-- RPC to read pedido by token (anon-safe)
CREATE OR REPLACE FUNCTION public.get_pedido_pena_by_token(_token text)
RETURNS TABLE(id uuid, taller_nombre text, matricula text, vehiculo text, piezas text, estado text, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, taller_nombre, matricula, vehiculo, piezas, estado, created_at
  FROM public.pedidos_pena
  WHERE confirm_token = _token
  LIMIT 1;
$$;

-- RPC to update estado by token (anon-safe, validated)
CREATE OR REPLACE FUNCTION public.actualizar_estado_pedido_pena(_token text, _estado text)
RETURNS TABLE(id uuid, estado text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row record;
BEGIN
  IF _estado NOT IN ('pendiente','aceptado','preparacion','enviado','entregado') THEN
    RAISE EXCEPTION 'Estado inválido: %', _estado;
  END IF;

  UPDATE public.pedidos_pena
  SET estado = _estado
  WHERE confirm_token = _token
  RETURNING pedidos_pena.id, pedidos_pena.estado INTO _row;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY SELECT _row.id, _row.estado;
END;
$$;