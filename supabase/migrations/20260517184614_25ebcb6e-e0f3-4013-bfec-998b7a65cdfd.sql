
ALTER TABLE public.gestiones
  ADD COLUMN IF NOT EXISTS wa_abierto boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.rechazar_gestion(_token text)
RETURNS TABLE(id uuid, matricula text, estado text, previous_estado text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  _g record;
begin
  select g.id, g.matricula, g.estado into _g
  from public.gestiones g where g.confirm_token = _token;
  if not found then return; end if;
  if _g.estado = 'rechazado' then
    return query select _g.id, _g.matricula, _g.estado, _g.estado;
    return;
  end if;
  update public.gestiones set estado = 'rechazado' where confirm_token = _token;
  return query select _g.id, _g.matricula, 'rechazado'::text, _g.estado;
end $function$;
