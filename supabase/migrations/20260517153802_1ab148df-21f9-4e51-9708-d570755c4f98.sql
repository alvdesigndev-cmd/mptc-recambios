
-- 1. Enum de roles
do $$ begin
  create type public.app_role as enum ('taller-1','taller-2','pena');
exception when duplicate_object then null; end $$;

-- 2. Tabla profiles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null,
  taller_id text not null,
  taller_name text not null default '',
  ciudad text not null default '',
  mecanico text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles self select" on public.profiles;
create policy "profiles self select" on public.profiles for select to authenticated using (auth.uid() = user_id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update to authenticated using (auth.uid() = user_id);

drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert" on public.profiles for insert to authenticated with check (auth.uid() = user_id);

-- 3. Funciones security definer
create or replace function public.get_user_role(_uid uuid)
returns public.app_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where user_id = _uid
$$;

create or replace function public.get_user_taller_id(_uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select taller_id from public.profiles where user_id = _uid
$$;

create or replace function public.is_pena(_uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where user_id = _uid and role = 'pena')
$$;

-- 4. Trigger handle_new_user
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
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
      when 'pena' then 'grupo-pena'
    end);
  _taller_name := coalesce(new.raw_user_meta_data->>'taller_name',
    case _role
      when 'pena' then 'Grupo Peña'
      when 'taller-1' then 'Taller 1'
      when 'taller-2' then 'Taller 2'
    end);
  insert into public.profiles (user_id, role, taller_id, taller_name, ciudad, mecanico)
  values (new.id, _role, _taller_id, _taller_name,
    coalesce(new.raw_user_meta_data->>'ciudad',''),
    coalesce(new.raw_user_meta_data->>'mecanico',''));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- 5. updated_at trigger genérico
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
for each row execute function public.touch_updated_at();

-- 6. RLS de clientes
drop policy if exists "anon_all_clientes" on public.clientes;
drop policy if exists "clientes select" on public.clientes;
drop policy if exists "clientes write" on public.clientes;
drop policy if exists "clientes update" on public.clientes;
drop policy if exists "clientes delete" on public.clientes;

create policy "clientes select" on public.clientes for select to authenticated
  using (taller_id = public.get_user_taller_id(auth.uid()));
create policy "clientes write" on public.clientes for insert to authenticated
  with check (taller_id = public.get_user_taller_id(auth.uid()));
create policy "clientes update" on public.clientes for update to authenticated
  using (taller_id = public.get_user_taller_id(auth.uid()));
create policy "clientes delete" on public.clientes for delete to authenticated
  using (taller_id = public.get_user_taller_id(auth.uid()));

-- 7. RLS de gestiones (taller propio + Peña ve las que son pedido_pena)
drop policy if exists "anon_all_gestiones" on public.gestiones;
drop policy if exists "gestiones select" on public.gestiones;
drop policy if exists "gestiones insert" on public.gestiones;
drop policy if exists "gestiones update" on public.gestiones;
drop policy if exists "gestiones delete" on public.gestiones;
drop policy if exists "gestiones confirm anon" on public.gestiones;

create policy "gestiones select" on public.gestiones for select to authenticated
  using (
    taller_id = public.get_user_taller_id(auth.uid())
    or (public.is_pena(auth.uid()) and pedido_pena = true)
  );
create policy "gestiones insert" on public.gestiones for insert to authenticated
  with check (taller_id = public.get_user_taller_id(auth.uid()));
create policy "gestiones update" on public.gestiones for update to authenticated
  using (
    taller_id = public.get_user_taller_id(auth.uid())
    or (public.is_pena(auth.uid()) and pedido_pena = true)
  );
create policy "gestiones delete" on public.gestiones for delete to authenticated
  using (taller_id = public.get_user_taller_id(auth.uid()));

-- 8. RLS de pedidos_pena (taller propietario + Peña ve todo)
drop policy if exists "anon_all_pedidos_pena" on public.pedidos_pena;
drop policy if exists "pedidos select" on public.pedidos_pena;
drop policy if exists "pedidos insert" on public.pedidos_pena;
drop policy if exists "pedidos update" on public.pedidos_pena;
drop policy if exists "pedidos delete" on public.pedidos_pena;

create policy "pedidos select" on public.pedidos_pena for select to authenticated
  using (
    taller_id = public.get_user_taller_id(auth.uid())
    or public.is_pena(auth.uid())
  );
create policy "pedidos insert" on public.pedidos_pena for insert to authenticated
  with check (
    taller_id = public.get_user_taller_id(auth.uid())
    or public.is_pena(auth.uid())
  );
create policy "pedidos update" on public.pedidos_pena for update to authenticated
  using (
    taller_id = public.get_user_taller_id(auth.uid())
    or public.is_pena(auth.uid())
  );

-- 9. Función pública para confirmar gestión por token (anónima)
create or replace function public.confirmar_gestion(_token text)
returns table(id uuid, matricula text, estado text, previous_estado text)
language plpgsql security definer set search_path = public as $$
declare
  _g record;
begin
  select g.id, g.matricula, g.estado into _g
  from public.gestiones g where g.confirm_token = _token;
  if not found then return; end if;
  if _g.estado = 'aceptado' then
    return query select _g.id, _g.matricula, _g.estado, _g.estado;
    return;
  end if;
  update public.gestiones set estado = 'aceptado' where confirm_token = _token;
  return query select _g.id, _g.matricula, 'aceptado'::text, _g.estado;
end $$;

grant execute on function public.confirmar_gestion(text) to anon, authenticated;
