
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  _role public.app_role;
  _taller_id text;
  _taller_name text;
begin
  _role := coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'taller-1');
  _taller_id := coalesce(new.raw_user_meta_data->>'taller_id',
    case _role
      when 'taller-1' then 'taller-1-mtc-recambios'
      when 'taller-2' then 'taller-2-mtc-recambios'
      when 'taller-3' then 'taller-3-tecniauto-express-marbella'
      when 'taller-4' then 'taller-4-mecanica-autofran'
      when 'taller-5' then 'taller-5-boxes-team-marbella'
      when 'pena' then 'grupo-pena'
    end);
  _taller_name := coalesce(new.raw_user_meta_data->>'taller_name',
    case _role
      when 'pena' then 'Grupo Peña'
      when 'taller-1' then 'Taller 1'
      when 'taller-2' then 'Taller 2'
      when 'taller-3' then 'TecniAuto Express Marbella'
      when 'taller-4' then 'Mecánica Autofran'
      when 'taller-5' then 'Boxes Team Marbella'
    end);
  insert into public.profiles (user_id, role, taller_id, taller_name, ciudad, mecanico)
  values (new.id, _role, _taller_id, _taller_name,
    coalesce(new.raw_user_meta_data->>'ciudad',''),
    coalesce(new.raw_user_meta_data->>'mecanico',''));
  return new;
end $function$;
