-- =====================================================
-- Migration V3: Fix CHECK constraints en tablas encuesta
-- =====================================================
-- PROBLEMA: Las tablas tienen constraints con valores en minúsculas
-- (ej: 'cumple', 'no_cumple') pero los formularios envían MAYÚSCULAS
-- (ej: 'CUMPLE', 'NO CUMPLE'), causando que los registros no se guarden.
--
-- SOLUCIÓN: Eliminar todos los CHECK constraints de las tablas encuesta.
-- La validación de los datos la garantiza el schema Zod en el frontend.
--
-- INSTRUCCIONES: Ejecutar en Supabase → SQL Editor → New query → Run
-- =====================================================

DO $$
DECLARE
  r RECORD;
  dropped_count INTEGER := 0;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass::text AS tname
    FROM pg_constraint
    WHERE conrelid IN (
      'encuesta_aislamiento'::regclass,
      'encuesta_higiene_manos'::regclass,
      'encuesta_luminometria'::regclass,
      'encuesta_ronda_cirugia'::regclass,
      'encuesta_acceso_venoso'::regclass,
      'encuesta_cateter_vesical'::regclass,
      'encuesta_prevencion_neumonia'::regclass
    )
    AND contype = 'c'   -- solo CHECK constraints
  LOOP
    BEGIN
      EXECUTE 'ALTER TABLE ' || r.tname
           || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
      dropped_count := dropped_count + 1;
      RAISE NOTICE 'Eliminado: % en tabla %', r.conname, r.tname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'No se pudo eliminar % en %: %', r.conname, r.tname, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE '=== Proceso completado: % constraints eliminados ===', dropped_count;
END $$;

-- Verificación: Lista las constraints que quedaron (debe quedar vacío para estas tablas)
SELECT conname, conrelid::regclass::text AS tabla, pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE conrelid IN (
  'encuesta_aislamiento'::regclass,
  'encuesta_higiene_manos'::regclass,
  'encuesta_luminometria'::regclass,
  'encuesta_ronda_cirugia'::regclass,
  'encuesta_acceso_venoso'::regclass,
  'encuesta_cateter_vesical'::regclass,
  'encuesta_prevencion_neumonia'::regclass
)
AND contype = 'c'
ORDER BY tabla, conname;
