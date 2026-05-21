-- =============================================================
-- Migración v5 — Convertir columnas GENERATED ALWAYS a regulares
-- Ejecutar en: Supabase → SQL Editor
-- =============================================================
-- Las columnas sumatoria_cumplimiento y semana_mes fueron creadas
-- como GENERATED ALWAYS AS (columnas calculadas automáticamente).
-- Esto impedía que los formularios insertaran valores manualmente.
-- Esta migración las convierte en columnas INTEGER normales y
-- rellena los valores existentes.
-- =============================================================

-- 1. encuesta_higiene_manos: sumatoria_cumplimiento
ALTER TABLE encuesta_higiene_manos
  ALTER COLUMN sumatoria_cumplimiento DROP EXPRESSION IF EXISTS;

-- 2. encuesta_acceso_venoso: semana_mes
ALTER TABLE encuesta_acceso_venoso
  ALTER COLUMN semana_mes DROP EXPRESSION IF EXISTS;

-- 3. encuesta_cateter_vesical: semana_mes
ALTER TABLE encuesta_cateter_vesical
  ALTER COLUMN semana_mes DROP EXPRESSION IF EXISTS;

-- 4. encuesta_prevencion_neumonia: semana_mes
ALTER TABLE encuesta_prevencion_neumonia
  ALTER COLUMN semana_mes DROP EXPRESSION IF EXISTS;

-- 5. Rellenar semana_mes en registros existentes (calcula la semana del mes)
UPDATE encuesta_acceso_venoso
  SET semana_mes = CEIL(EXTRACT(DAY FROM fecha_registro::date) / 7.0)::integer
  WHERE semana_mes IS NULL AND fecha_registro IS NOT NULL;

UPDATE encuesta_cateter_vesical
  SET semana_mes = CEIL(EXTRACT(DAY FROM fecha_registro::date) / 7.0)::integer
  WHERE semana_mes IS NULL AND fecha_registro IS NOT NULL;

UPDATE encuesta_prevencion_neumonia
  SET semana_mes = CEIL(EXTRACT(DAY FROM fecha_registro::date) / 7.0)::integer
  WHERE semana_mes IS NULL AND fecha_registro IS NOT NULL;

-- 6. Verificación — debe mostrar is_generated = 'NEVER' para las 4 columnas
SELECT
  table_name,
  column_name,
  is_generated,
  generation_expression
FROM information_schema.columns
WHERE table_name IN (
  'encuesta_higiene_manos',
  'encuesta_acceso_venoso',
  'encuesta_cateter_vesical',
  'encuesta_prevencion_neumonia'
)
AND column_name IN ('sumatoria_cumplimiento', 'semana_mes')
ORDER BY table_name, column_name;
