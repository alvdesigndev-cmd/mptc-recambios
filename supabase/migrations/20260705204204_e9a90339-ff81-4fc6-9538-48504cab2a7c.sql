CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _role public.app_role;
  _taller_id text;
  _taller_row public.talleres%rowtype;
  _taller_name text;
  _expected_prefix text;
begin
  _role := coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'taller-1');

  IF _role = 'admin' THEN
    _taller_id := coalesce(new.raw_user_meta_data->>'taller_id', 'admin');
    _taller_name := coalesce(new.raw_user_meta_data->>'taller_name', 'Administración');
  ELSIF _role = 'pena' THEN
    _taller_id := 'grupo-pena';
    _taller_name := 'Grupo Peña';
  ELSE
    _taller_id := new.raw_user_meta_data->>'taller_id';

    IF _taller_id IS NULL OR length(trim(_taller_id)) = 0 THEN
      RAISE EXCEPTION 'Debes seleccionar un taller válido para este tipo de cuenta.';
    END IF;

    -- El taller debe existir
    SELECT * INTO _taller_row FROM public.talleres WHERE taller_id = _taller_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'El taller seleccionado (%) no existe. Contacta con el administrador.', _taller_id;
    END IF;

    -- El taller debe estar activo
    IF _taller_row.activo = false THEN
      RAISE EXCEPTION 'El taller % está desactivado. Contacta con el administrador.', _taller_id;
    END IF;

    -- El identificador debe coincidir con el rol (taller-N-...)
    _expected_prefix := _role::text || '-';
    IF position(_expected_prefix in _taller_id) <> 1 THEN
      RAISE EXCEPTION 'El taller seleccionado (%) no corresponde al rol elegido (%).', _taller_id, _role;
    END IF;

    _taller_name := coalesce(
      new.raw_user_meta_data->>'taller_name',
      _taller_row.nombre,
      'Taller'
    );
  END IF;

  insert into public.profiles (user_id, role, taller_id, taller_name, ciudad, mecanico)
  values (new.id, _role, _taller_id, _taller_name,
    coalesce(new.raw_user_meta_data->>'ciudad', coalesce(_taller_row.ciudad, '')),
    coalesce(new.raw_user_meta_data->>'mecanico', ''));
  return new;
end;
$function$;