CREATE TABLE public.gestion_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gestion_id uuid NOT NULL REFERENCES public.gestiones(id) ON DELETE CASCADE,
  taller_id text,
  tipo text NOT NULL,
  actor text,
  actor_user_id uuid,
  detalle text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX gestion_eventos_gestion_idx ON public.gestion_eventos (gestion_id, created_at DESC);

GRANT SELECT, INSERT ON public.gestion_eventos TO authenticated;
GRANT ALL ON public.gestion_eventos TO service_role;

ALTER TABLE public.gestion_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gestion_eventos select" ON public.gestion_eventos
FOR SELECT TO authenticated
USING (
  taller_id = public.get_user_taller_id(auth.uid())
  OR public.is_pena(auth.uid())
  OR public.is_admin(auth.uid())
);

CREATE POLICY "gestion_eventos insert" ON public.gestion_eventos
FOR INSERT TO authenticated
WITH CHECK (
  taller_id = public.get_user_taller_id(auth.uid())
  OR public.is_admin(auth.uid())
);

-- Registrar automáticamente la aceptación / rechazo del cliente
CREATE OR REPLACE FUNCTION public.confirmar_gestion(_token text)
 RETURNS TABLE(id uuid, matricula text, estado text, previous_estado text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _g record;
begin
  select g.id, g.matricula, g.estado, g.taller_id, g.importe into _g
  from public.gestiones g where g.confirm_token = _token;
  if not found then return; end if;
  if _g.estado = 'aceptado' then
    return query select _g.id, _g.matricula, _g.estado, _g.estado;
    return;
  end if;
  update public.gestiones set estado = 'aceptado' where confirm_token = _token;
  insert into public.gestion_eventos (gestion_id, taller_id, tipo, actor, detalle, metadata)
  values (_g.id, _g.taller_id, 'aceptado', 'cliente', 'El cliente aceptó el presupuesto',
          jsonb_build_object('importe', _g.importe, 'estado_anterior', _g.estado));
  return query select _g.id, _g.matricula, 'aceptado'::text, _g.estado;
end $function$;

CREATE OR REPLACE FUNCTION public.rechazar_gestion(_token text)
 RETURNS TABLE(id uuid, matricula text, estado text, previous_estado text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _g record;
begin
  select g.id, g.matricula, g.estado, g.taller_id, g.importe into _g
  from public.gestiones g where g.confirm_token = _token;
  if not found then return; end if;
  if _g.estado = 'rechazado' then
    return query select _g.id, _g.matricula, _g.estado, _g.estado;
    return;
  end if;
  update public.gestiones set estado = 'rechazado' where confirm_token = _token;
  insert into public.gestion_eventos (gestion_id, taller_id, tipo, actor, detalle, metadata)
  values (_g.id, _g.taller_id, 'rechazado', 'cliente', 'El cliente rechazó el presupuesto',
          jsonb_build_object('importe', _g.importe, 'estado_anterior', _g.estado));
  return query select _g.id, _g.matricula, 'rechazado'::text, _g.estado;
end $function$;