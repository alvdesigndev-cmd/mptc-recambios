-- Table
CREATE TABLE IF NOT EXISTS public.talleres (
  taller_id text PRIMARY KEY,
  nombre text NOT NULL,
  ciudad text NOT NULL DEFAULT '',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.talleres TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.talleres TO authenticated;
GRANT ALL ON public.talleres TO service_role;

ALTER TABLE public.talleres ENABLE ROW LEVEL SECURITY;

-- is_admin helper
CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _uid AND role = 'admin')
$$;

-- Policies
DROP POLICY IF EXISTS "talleres_select_authenticated" ON public.talleres;
CREATE POLICY "talleres_select_authenticated"
  ON public.talleres FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "talleres_admin_insert" ON public.talleres;
CREATE POLICY "talleres_admin_insert"
  ON public.talleres FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "talleres_admin_update" ON public.talleres;
CREATE POLICY "talleres_admin_update"
  ON public.talleres FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "talleres_admin_delete" ON public.talleres;
CREATE POLICY "talleres_admin_delete"
  ON public.talleres FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- updated_at trigger
DROP TRIGGER IF EXISTS talleres_touch_updated_at ON public.talleres;
CREATE TRIGGER talleres_touch_updated_at
  BEFORE UPDATE ON public.talleres
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed
INSERT INTO public.talleres (taller_id, nombre, ciudad, activo) VALUES
  ('taller-1-mtc-recambios', 'MTC Recambios (Taller 1)', '', true),
  ('taller-2-mtc-recambios', 'MTC Recambios (Taller 2)', '', true),
  ('taller-3-tecniauto-express-marbella', 'TecniAuto Express Marbella', 'Marbella', true),
  ('taller-4-mecanica-autofran', 'Mecánica Autofran', '', true),
  ('taller-5-boxes-team-marbella', 'Boxes Team Marbella', 'Marbella', true)
ON CONFLICT (taller_id) DO NOTHING;

-- Rename taller_id cascade (admin only)
CREATE OR REPLACE FUNCTION public.rename_taller_id(_old text, _new text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Solo administradores pueden renombrar talleres';
  END IF;
  IF _new IS NULL OR length(trim(_new)) = 0 THEN
    RAISE EXCEPTION 'El nuevo identificador no puede estar vacío';
  END IF;
  IF _old = _new THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.talleres WHERE taller_id = _new) THEN
    RAISE EXCEPTION 'Ya existe un taller con ese identificador: %', _new;
  END IF;

  INSERT INTO public.talleres (taller_id, nombre, ciudad, activo)
    SELECT _new, nombre, ciudad, activo FROM public.talleres WHERE taller_id = _old;

  UPDATE public.profiles     SET taller_id = _new WHERE taller_id = _old;
  UPDATE public.clientes     SET taller_id = _new WHERE taller_id = _old;
  UPDATE public.gestiones    SET taller_id = _new WHERE taller_id = _old;
  UPDATE public.pedidos_pena SET taller_id = _new WHERE taller_id = _old;

  DELETE FROM public.talleres WHERE taller_id = _old;
END;
$$;

REVOKE ALL ON FUNCTION public.rename_taller_id(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rename_taller_id(text, text) TO authenticated;

-- Update handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  _role public.app_role;
  _taller_id text;
  _taller_row public.talleres%rowtype;
  _taller_name text;
begin
  _role := coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'taller-1');

  IF _role = 'admin' THEN
    _taller_id := coalesce(new.raw_user_meta_data->>'taller_id', 'admin');
    _taller_name := coalesce(new.raw_user_meta_data->>'taller_name', 'Administración');
  ELSIF _role = 'pena' THEN
    _taller_id := 'grupo-pena';
    _taller_name := 'Grupo Peña';
  ELSE
    _taller_id := coalesce(new.raw_user_meta_data->>'taller_id',
      case _role
        when 'taller-1' then 'taller-1-mtc-recambios'
        when 'taller-2' then 'taller-2-mtc-recambios'
        when 'taller-3' then 'taller-3-tecniauto-express-marbella'
        when 'taller-4' then 'taller-4-mecanica-autofran'
        when 'taller-5' then 'taller-5-boxes-team-marbella'
      end);

    SELECT * INTO _taller_row FROM public.talleres WHERE taller_id = _taller_id;
    IF FOUND AND _taller_row.activo = false THEN
      RAISE EXCEPTION 'El taller % está desactivado. Contacta con el administrador.', _taller_id;
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
$$;