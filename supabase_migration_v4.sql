-- =====================================================
-- Migration V4: Columnas faltantes en todas las tablas
-- =====================================================
-- CAUSA DEL PROBLEMA: Los formularios envían campos nuevos
-- (adjuntos, registrado_por, semana_mes, sumatoria_cumplimiento, etc.)
-- que no existen en las tablas originales. Supabase rechaza el INSERT
-- completo cuando cualquier columna desconocida está presente.
-- Los formularios no mostraban el error → navegaban sin guardar.
--
-- SOLUCIÓN: Agregar todas las columnas faltantes con IF NOT EXISTS.
--
-- INSTRUCCIONES: Ejecutar en Supabase → SQL Editor → New query → Run
-- =====================================================

-- ─── 1. encuesta_higiene_manos ────────────────────────────────────────────
ALTER TABLE encuesta_higiene_manos
  ADD COLUMN IF NOT EXISTS adjuntos                   jsonb        DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS registrado_por             uuid,
  ADD COLUMN IF NOT EXISTS sumatoria_cumplimiento     integer      DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nombre_quien_diligencia    text,
  ADD COLUMN IF NOT EXISTS soporte_no_cumplimiento    text,
  ADD COLUMN IF NOT EXISTS fecha_registro             timestamptz;

-- ─── 2. encuesta_luminometria ─────────────────────────────────────────────
ALTER TABLE encuesta_luminometria
  ADD COLUMN IF NOT EXISTS adjuntos        jsonb   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS registrado_por  uuid,
  ADD COLUMN IF NOT EXISTS rango           text;

-- ─── 3. encuesta_ronda_cirugia ────────────────────────────────────────────
ALTER TABLE encuesta_ronda_cirugia
  ADD COLUMN IF NOT EXISTS adjuntos                jsonb   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS registrado_por          uuid,
  ADD COLUMN IF NOT EXISTS identificacion_paciente text,
  ADD COLUMN IF NOT EXISTS nombre_paciente         text;

-- ─── 4. encuesta_acceso_venoso ────────────────────────────────────────────
ALTER TABLE encuesta_acceso_venoso
  ADD COLUMN IF NOT EXISTS adjuntos                    jsonb   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS registrado_por              uuid,
  ADD COLUMN IF NOT EXISTS semana_mes                  integer,
  ADD COLUMN IF NOT EXISTS observacion_no_cumplimiento text,
  ADD COLUMN IF NOT EXISTS nombre_paciente             text;

-- lista_chequeo_cvc: convertir a text si existe como boolean
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'encuesta_acceso_venoso'
      AND column_name = 'lista_chequeo_cvc'
      AND data_type = 'boolean'
  ) THEN
    ALTER TABLE encuesta_acceso_venoso
      ALTER COLUMN lista_chequeo_cvc TYPE text USING lista_chequeo_cvc::text;
    RAISE NOTICE 'lista_chequeo_cvc convertida de boolean a text';
  END IF;
END $$;
ALTER TABLE encuesta_acceso_venoso
  ADD COLUMN IF NOT EXISTS lista_chequeo_cvc text;

-- ─── 5. encuesta_cateter_vesical ──────────────────────────────────────────
ALTER TABLE encuesta_cateter_vesical
  ADD COLUMN IF NOT EXISTS adjuntos                    jsonb   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS registrado_por              uuid,
  ADD COLUMN IF NOT EXISTS semana_mes                  integer,
  ADD COLUMN IF NOT EXISTS nombre_paciente             text,
  ADD COLUMN IF NOT EXISTS observacion_no_cumplimiento text;

-- ─── 6. encuesta_prevencion_neumonia ──────────────────────────────────────
ALTER TABLE encuesta_prevencion_neumonia
  ADD COLUMN IF NOT EXISTS adjuntos                    jsonb   DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS registrado_por              uuid,
  ADD COLUMN IF NOT EXISTS semana_mes                  integer,
  ADD COLUMN IF NOT EXISTS observacion_no_cumplimiento text,
  ADD COLUMN IF NOT EXISTS nombre_paciente             text;

-- ─── 7. Desactivar RLS (por si quedó activo) ──────────────────────────────
ALTER TABLE encuesta_higiene_manos      DISABLE ROW LEVEL SECURITY;
ALTER TABLE encuesta_luminometria       DISABLE ROW LEVEL SECURITY;
ALTER TABLE encuesta_ronda_cirugia      DISABLE ROW LEVEL SECURITY;
ALTER TABLE encuesta_acceso_venoso      DISABLE ROW LEVEL SECURITY;
ALTER TABLE encuesta_cateter_vesical    DISABLE ROW LEVEL SECURITY;
ALTER TABLE encuesta_prevencion_neumonia DISABLE ROW LEVEL SECURITY;
-- (aislamiento ya fue corregido antes)
ALTER TABLE encuesta_aislamiento        DISABLE ROW LEVEL SECURITY;

-- ─── 8. Verificación final ────────────────────────────────────────────────
-- Muestra las columnas nuevas que quedaron en cada tabla
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name IN (
  'encuesta_higiene_manos',
  'encuesta_luminometria',
  'encuesta_ronda_cirugia',
  'encuesta_acceso_venoso',
  'encuesta_cateter_vesical',
  'encuesta_prevencion_neumonia'
)
AND column_name IN (
  'adjuntos', 'registrado_por', 'semana_mes',
  'sumatoria_cumplimiento', 'nombre_paciente',
  'identificacion_paciente', 'lista_chequeo_cvc',
  'observacion_no_cumplimiento', 'nombre_quien_diligencia'
)
ORDER BY table_name, column_name;
