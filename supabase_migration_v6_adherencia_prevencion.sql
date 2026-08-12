-- =============================================================
-- Migración v6 — Adherencia Prevención NAV / NC
-- Ejecutar en: Supabase → SQL Editor (ya aplicada vía MCP el 2026-08-11)
-- =============================================================
-- Dos módulos nuevos de auditoría de adherencia, en reemplazo de:
--   - docs/ago11/adherecnia prevencion neumonia ventilacion mecanica.xlsx (NAV)
--   - docs/ago11/adherencia prevencion neumonia clinica.xlsx (NC)
--
-- Convención de puntaje: SI = 1, N/A = 1, NO = 0 (ver columnas criterio_*).
-- Excepción — NAV criterio 5 (presión del neumotaponador): es un valor
-- numérico, no SI/NO/NA. El rango aceptable es 22–30; los valores fuera de
-- ese rango (<22 o >30) se resaltan en rojo en la UI y se contabilizan como
-- hallazgo (=1) vía la columna generada criterio_5_fuera_rango.
--
-- NOTA: este archivo NO incluye la migración de datos históricos del Excel
-- (contienen identificación de pacientes / PII) — esos INSERT se ejecutaron
-- directamente contra Supabase sin pasar por el repo, conforme a la política
-- de habeas data del proyecto (CLAUDE.md).
-- =============================================================

-- ════════════════════════════════════════════════════════════════
-- Adherencia Prevención NAV (Neumonía Asociada a Ventilación Mecánica)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE public.encuesta_adherencia_prevencion_nav (
  id                          uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  fecha_registro              date NOT NULL,
  semana_mes                  integer GENERATED ALWAYS AS (ceil(extract(day from fecha_registro) / 7.0)::integer) STORED,
  servicio                    text NOT NULL DEFAULT 'UCI',
  documento_identificacion    text,
  criterio_1_cabecera         text CHECK (criterio_1_cabecera IN ('SI','NO','NA')),
  criterio_2_higiene_oral     text CHECK (criterio_2_higiene_oral IN ('SI','NO','NA')),
  criterio_3_implementos      text CHECK (criterio_3_implementos IN ('SI','NO','NA')),
  criterio_4_lista_chequeo    text CHECK (criterio_4_lista_chequeo IN ('SI','NO','NA')),
  criterio_5_presion_neumotaponador integer,
  criterio_5_fuera_rango      boolean GENERATED ALWAYS AS (
                                 criterio_5_presion_neumotaponador IS NOT NULL
                                 AND (criterio_5_presion_neumotaponador < 22 OR criterio_5_presion_neumotaponador > 30)
                               ) STORED,
  criterio_6_interrupcion_sedacion text CHECK (criterio_6_interrupcion_sedacion IN ('SI','NO','NA')),
  observacion_no_cumplimiento text,
  estado                      text NOT NULL DEFAULT 'pendiente',
  origen_historico             boolean NOT NULL DEFAULT false,
  registrado_por              uuid REFERENCES auth.users(id),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  adjuntos                    jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TRIGGER trg_adherencia_nav_updated BEFORE UPDATE ON public.encuesta_adherencia_prevencion_nav
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.encuesta_adherencia_prevencion_nav ENABLE ROW LEVEL SECURITY;

CREATE POLICY encuesta_adherencia_prevencion_nav_sel ON public.encuesta_adherencia_prevencion_nav
  FOR SELECT USING (true);
CREATE POLICY encuesta_adherencia_prevencion_nav_ins ON public.encuesta_adherencia_prevencion_nav
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY encuesta_adherencia_prevencion_nav_upd ON public.encuesta_adherencia_prevencion_nav
  FOR UPDATE USING (puede_editar_encuesta(registrado_por, estado)) WITH CHECK (puede_editar_encuesta(registrado_por, estado));
CREATE POLICY encuesta_adherencia_prevencion_nav_del ON public.encuesta_adherencia_prevencion_nav
  FOR DELETE USING (is_admin());

-- ════════════════════════════════════════════════════════════════
-- Adherencia Prevención NC (Neumonía Clínica / Intrahospitalaria)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE public.encuesta_adherencia_prevencion_nc (
  id                          uuid PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  fecha_registro              date NOT NULL,
  semana_mes                  integer GENERATED ALWAYS AS (ceil(extract(day from fecha_registro) / 7.0)::integer) STORED,
  servicio                    text NOT NULL DEFAULT 'Hospitalización',
  documento_identificacion    text,
  criterio_1_cabecera         text CHECK (criterio_1_cabecera IN ('SI','NO','NA')),
  criterio_2_higiene_oral     text CHECK (criterio_2_higiene_oral IN ('SI','NO','NA')),
  criterio_3_implementos      text CHECK (criterio_3_implementos IN ('SI','NO','NA')),
  criterio_4_movilizacion     text CHECK (criterio_4_movilizacion IN ('SI','NO','NA')),
  criterio_5_riesgo_disfagia  text CHECK (criterio_5_riesgo_disfagia IN ('SI','NO','NA')),
  observacion_no_cumplimiento text,
  estado                      text NOT NULL DEFAULT 'pendiente',
  origen_historico             boolean NOT NULL DEFAULT false,
  registrado_por              uuid REFERENCES auth.users(id),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  adjuntos                    jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TRIGGER trg_adherencia_nc_updated BEFORE UPDATE ON public.encuesta_adherencia_prevencion_nc
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE public.encuesta_adherencia_prevencion_nc ENABLE ROW LEVEL SECURITY;

CREATE POLICY encuesta_adherencia_prevencion_nc_sel ON public.encuesta_adherencia_prevencion_nc
  FOR SELECT USING (true);
CREATE POLICY encuesta_adherencia_prevencion_nc_ins ON public.encuesta_adherencia_prevencion_nc
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY encuesta_adherencia_prevencion_nc_upd ON public.encuesta_adherencia_prevencion_nc
  FOR UPDATE USING (puede_editar_encuesta(registrado_por, estado)) WITH CHECK (puede_editar_encuesta(registrado_por, estado));
CREATE POLICY encuesta_adherencia_prevencion_nc_del ON public.encuesta_adherencia_prevencion_nc
  FOR DELETE USING (is_admin());

-- ── Permisos de captura (Configuración → Permisos): todos los roles pueden capturar ──
INSERT INTO public.modulo_permisos (modulo, rol, puede_capturar) VALUES
  ('adherencia_prevencion_nav', 'administrador', true),
  ('adherencia_prevencion_nav', 'coordinador',   true),
  ('adherencia_prevencion_nav', 'auxiliar',      true),
  ('adherencia_prevencion_nc',  'administrador', true),
  ('adherencia_prevencion_nc',  'coordinador',   true),
  ('adherencia_prevencion_nc',  'auxiliar',      true);
