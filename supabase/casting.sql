-- ═══════════════════════════════════════════════════════════
--  Convocatoria de imagen · tabla `casting` en la base de LA PIZARRA
--  IBERO Tijuana
--
--  NO SE HA CORRIDO. Es la propuesta para cuando Leo apruebe guardar
--  las respuestas en la base de LA PIZARRA (proyecto wrezcukptrtmnhnlxmao):
--
--      python supabase/correr.py casting.sql
--
--  Se puede volver a correr sin miedo: no borra ni duplica nada.
--
--  EL MISMO PATRÓN QUE `solicitudes` Y `revisiones`
--  Quien llena el formulario es un alumno sin cuenta. Por eso el
--  permiso va al revés que en `registros`: cualquiera (anon) puede
--  DEJAR un renglón, con forma y tamaño acotados; sólo el equipo
--  (con sesión de LA PIZARRA) puede leer la lista, cambiar el estado
--  y la nota, o borrar.
--
--  LA FOTO VA DENTRO DEL RENGLÓN
--  Como `revisiones.pieza`: un data URL JPEG de ~60 KB. Así no hay
--  cubeta de Storage con políticas para anon, respaldar.py se la
--  lleva junto con todo, y borrar el renglón borra la foto.
-- ═══════════════════════════════════════════════════════════


-- ── 1. La tabla ────────────────────────────────────────────

create table if not exists public.casting (
  folio          text primary key,            -- 8 caracteres, lo genera el formulario
  nombre         text not null default '',
  matricula      text not null default '',
  carrera        text not null default '',
  semestre       integer not null default 0,
  correo         text not null default '',
  telefono       text not null default '',
  instagram      text not null default '',
  foto           text not null default '',    -- data:image/jpeg;base64,…
  disponibilidad jsonb not null default '[]'::jsonb,   -- ['2026-10-26|08', …]
  consentimientos jsonb not null default '{}'::jsonb,  -- {datos: true, imagen: true}
  estado         text not null default 'nueva',
  nota           text not null default '',
  atendido_por   text not null default '',
  creado         timestamptz not null default now()
);

-- Género (desde el 20-oct-2026): mujer / hombre / otro, o vacío en los
-- registros anteriores, que el equipo completa desde la ficha.
alter table public.casting add column if not exists genero text not null default '';
-- Sesión a la que se convocó (id de config.sesiones) o vacío. Se
-- asigna desde el apartado «Sesiones» de la vista del equipo.
alter table public.casting add column if not exists sesion text not null default '';

alter table public.casting drop constraint if exists casting_estado_check;
alter table public.casting add constraint casting_estado_check
  check (estado in ('nueva', 'convocada', 'descartada'));

-- Una persona, un registro. El formulario avisa si se repite el correo.
-- (Hasta el 19-oct-2026 era por matrícula; Leo decidió no pedirla.)
drop index if exists public.idx_casting_matricula;
create unique index if not exists idx_casting_correo
  on public.casting (lower(correo));

comment on table public.casting is
  'Registros de la convocatoria de imagen institucional (alumnos que quieren salir en fotos y video).';


-- ── 2. Quién puede tocar qué ───────────────────────────────

alter table public.casting enable row level security;

drop policy if exists "registrarse"       on public.casting;
drop policy if exists "ver registros"     on public.casting;
drop policy if exists "atender registros" on public.casting;
drop policy if exists "quitar registros"  on public.casting;

-- Registrarse lo puede hacer cualquiera, con o sin cuenta. Lo que
-- no puede es dejar cualquier cosa: entra como nueva, sin nota ni
-- atención, con folio bien formado, con los dos consentimientos
-- marcados y con tamaños que no sirvan para llenar la base.
create policy "registrarse" on public.casting
  for insert to anon, authenticated
  with check (
    estado = 'nueva'
    and nota = ''
    and atendido_por = ''
    and folio ~ '^[A-Z0-9]{8}$'
    and char_length(nombre)    between 5 and 120
    and char_length(matricula) <= 20
    and char_length(carrera)   between 1 and 80
    and semestre between 0 and 12            -- 0 = egresado (desde el 20-oct-2026)
    and char_length(correo)    between 6 and 120
    and telefono ~ '^[0-9]{10}$'
    and genero in ('', 'mujer', 'hombre', 'otro')
    and sesion = ''
    and char_length(instagram) <= 40
    and (consentimientos->>'datos')::boolean = true
    and (consentimientos->>'imagen')::boolean = true
    -- La foto sale del formulario a 640 px y calidad 0.82: 40-80 KB.
    -- 400 KB deja aire para una foto subida grande ya reducida.
    and octet_length(foto) between 1000 and 400000
    and jsonb_typeof(disponibilidad) = 'array'
    and jsonb_array_length(disponibilidad) between 1 and 200
  );

-- La lista la ve todo el equipo con cuenta en LA PIZARRA.
create policy "ver registros" on public.casting
  for select to authenticated using (true);

-- Cambiar estado y nota: cualquiera del equipo.
create policy "atender registros" on public.casting
  for update to authenticated using (true) with check (true);

-- Borrar: también el equipo (al cerrar la convocatoria se borra lo de
-- quienes no participaron, como dice el aviso de privacidad).
create policy "quitar registros" on public.casting
  for delete to authenticated using (true);

grant select, insert, update, delete on public.casting to authenticated;
grant insert on public.casting to anon;


-- ── 3. Comprobar ───────────────────────────────────────────
select 'tabla casting' as que,
       case when to_regclass('public.casting') is not null then 'sí' else 'FALTA' end as estado
union all
select 'políticas', count(*)::text || ' de 4'
  from pg_policies where tablename = 'casting';
