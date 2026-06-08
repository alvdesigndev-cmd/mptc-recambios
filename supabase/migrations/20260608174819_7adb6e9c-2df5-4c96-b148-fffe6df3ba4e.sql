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
  );