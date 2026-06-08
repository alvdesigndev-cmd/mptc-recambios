CREATE OR REPLACE FUNCTION public.recalc_cliente_gestiones()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Recalcular para clientes afectados por NEW (INSERT/UPDATE)
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.clientes c
    SET total_gestiones = (
        SELECT COUNT(*) FROM public.gestiones g
        WHERE g.taller_id = c.taller_id
          AND (
            (g.matricula IS NOT NULL AND c.matricula IS NOT NULL AND g.matricula = c.matricula)
            OR
            (g.cliente_telefono IS NOT NULL AND c.telefono IS NOT NULL AND g.cliente_telefono = c.telefono)
          )
      ),
      ultima_gestion = (
        SELECT MAX(created_at) FROM public.gestiones g
        WHERE g.taller_id = c.taller_id
          AND (
            (g.matricula IS NOT NULL AND c.matricula IS NOT NULL AND g.matricula = c.matricula)
            OR
            (g.cliente_telefono IS NOT NULL AND c.telefono IS NOT NULL AND g.cliente_telefono = c.telefono)
          )
      )
    WHERE c.taller_id = NEW.taller_id
      AND (
        (NEW.matricula IS NOT NULL AND c.matricula IS NOT NULL AND c.matricula = NEW.matricula)
        OR
        (NEW.cliente_telefono IS NOT NULL AND c.telefono IS NOT NULL AND c.telefono = NEW.cliente_telefono)
      );
  END IF;

  -- Recalcular para clientes afectados por OLD (UPDATE/DELETE)
  IF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    UPDATE public.clientes c
    SET total_gestiones = (
        SELECT COUNT(*) FROM public.gestiones g
        WHERE g.taller_id = c.taller_id
          AND (
            (g.matricula IS NOT NULL AND c.matricula IS NOT NULL AND g.matricula = c.matricula)
            OR
            (g.cliente_telefono IS NOT NULL AND c.telefono IS NOT NULL AND g.cliente_telefono = c.telefono)
          )
      ),
      ultima_gestion = (
        SELECT MAX(created_at) FROM public.gestiones g
        WHERE g.taller_id = c.taller_id
          AND (
            (g.matricula IS NOT NULL AND c.matricula IS NOT NULL AND g.matricula = c.matricula)
            OR
            (g.cliente_telefono IS NOT NULL AND c.telefono IS NOT NULL AND g.cliente_telefono = c.telefono)
          )
      )
    WHERE c.taller_id = OLD.taller_id
      AND (
        (OLD.matricula IS NOT NULL AND c.matricula IS NOT NULL AND c.matricula = OLD.matricula)
        OR
        (OLD.cliente_telefono IS NOT NULL AND c.telefono IS NOT NULL AND c.telefono = OLD.cliente_telefono)
      );
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_gestiones_recalc_cliente
AFTER INSERT OR UPDATE OR DELETE ON public.gestiones
FOR EACH ROW
EXECUTE FUNCTION public.recalc_cliente_gestiones();

-- Índices para acelerar los recálculos por matrícula y teléfono
CREATE INDEX IF NOT EXISTS gestiones_taller_matricula_idx ON public.gestiones(taller_id, matricula);
CREATE INDEX IF NOT EXISTS gestiones_taller_telefono_idx ON public.gestiones(taller_id, cliente_telefono);
CREATE INDEX IF NOT EXISTS clientes_taller_matricula_idx ON public.clientes(taller_id, matricula);
CREATE INDEX IF NOT EXISTS clientes_taller_telefono_idx ON public.clientes(taller_id, telefono);