-- ============================================================
--  MIGRACIÓN: encuesta_aislamiento
--  Ejecutar en: Supabase > SQL Editor
--  Propósito: Adaptar tabla a estructura del Excel (ENE 2026)
-- ============================================================

-- PASO 1: Agregar columnas nuevas
ALTER TABLE encuesta_aislamiento
  ADD COLUMN IF NOT EXISTS tiene_afiche          boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS bisuteria             boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS higiene_manos_previo  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS tipo_tapaboca         text,
  ADD COLUMN IF NOT EXISTS uso_gorro             boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS uso_guante            boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cuelga_bata           boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS higiene_manos_despues boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS observacion           text;

-- PASO 2: Eliminar columnas obsoletas
--   (uso_bata se MANTIENE — sigue en el nuevo formulario)
ALTER TABLE encuesta_aislamiento
  DROP COLUMN IF EXISTS uso_guantes,
  DROP COLUMN IF EXISTS uso_mascarilla,
  DROP COLUMN IF EXISTS uso_gafas,
  DROP COLUMN IF EXISTS lavado_manos,
  DROP COLUMN IF EXISTS habitacion_individual;

-- Eliminar señalizacion (con o sin tilde)
ALTER TABLE encuesta_aislamiento
  DROP COLUMN IF EXISTS señalizacion;
ALTER TABLE encuesta_aislamiento
  DROP COLUMN IF EXISTS senalizacion;

-- Renombrar observaciones → observacion (si aún existe la columna antigua)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'encuesta_aislamiento' AND column_name = 'observaciones'
  ) THEN
    ALTER TABLE encuesta_aislamiento RENAME COLUMN observaciones TO observacion;
  END IF;
END $$;

-- RESULTADO ESPERADO: tabla con columnas
--   id, created_at, fecha_registro, servicio, profesional, tipo_aislamiento,
--   nombre_evaluado, uso_bata, tiene_afiche, bisuteria, higiene_manos_previo,
--   tipo_tapaboca, uso_gorro, uso_guante, cuelga_bata, higiene_manos_despues,
--   adherencia, observacion, estado, registrado_por
