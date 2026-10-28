-- v8: Médicos gestionables por todos + Total Notificadas manual (Adherencia a Fichas)

-- 1. Médicos: cualquier usuario autenticado crea/edita; sólo admin elimina
drop policy if exists "medicos: solo admin modifica" on public.medicos;
create policy "medicos: autenticados insertan" on public.medicos
  for insert to authenticated with check (true);
create policy "medicos: autenticados actualizan" on public.medicos
  for update to authenticated using (true) with check (true);
create policy "medicos: solo admin elimina" on public.medicos
  for delete to authenticated using (get_user_rol() = 'administrador');

-- 2. Total notificadas ingresado a mano por mes. Aplica a los meses que no
--    tienen total en el resumen histórico (adherencia_resumen_mensual).
create table if not exists public.adherencia_total_notificado (
  id uuid primary key default uuid_generate_v4(),
  anio int not null,
  mes_num int not null check (mes_num between 1 and 12),
  total_notificado int not null check (total_notificado > 0),
  registrado_por uuid references auth.users(id) default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (anio, mes_num)
);
alter table public.adherencia_total_notificado enable row level security;

create policy adherencia_total_notificado_sel on public.adherencia_total_notificado
  for select to authenticated using (true);
-- Sólo meses iguales o anteriores al actual (hora Colombia). Una vez ingresado,
-- sólo el administrador puede corregirlo o borrarlo.
create policy adherencia_total_notificado_ins on public.adherencia_total_notificado
  for insert to authenticated with check (
    anio * 100 + mes_num <= to_char(now() at time zone 'America/Bogota', 'YYYYMM')::int
  );
create policy adherencia_total_notificado_upd on public.adherencia_total_notificado
  for update to authenticated
  using (get_user_rol() = 'administrador')
  with check (anio * 100 + mes_num <= to_char(now() at time zone 'America/Bogota', 'YYYYMM')::int);
create policy adherencia_total_notificado_del on public.adherencia_total_notificado
  for delete to authenticated using (get_user_rol() = 'administrador');
