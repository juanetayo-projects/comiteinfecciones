-- ============================================================
-- MIGRACIÓN V2 — Comité Infecciones
-- Ejecutar en: Supabase → SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1. Columna adjuntos (jsonb) en todas las tablas de encuestas
-- ------------------------------------------------------------
ALTER TABLE encuesta_aislamiento
  ADD COLUMN IF NOT EXISTS adjuntos jsonb DEFAULT '[]'::jsonb;

ALTER TABLE encuesta_higiene_manos
  ADD COLUMN IF NOT EXISTS adjuntos jsonb DEFAULT '[]'::jsonb;

ALTER TABLE encuesta_luminometria
  ADD COLUMN IF NOT EXISTS adjuntos jsonb DEFAULT '[]'::jsonb;

ALTER TABLE encuesta_ronda_cirugia
  ADD COLUMN IF NOT EXISTS adjuntos jsonb DEFAULT '[]'::jsonb;

ALTER TABLE encuesta_acceso_venoso
  ADD COLUMN IF NOT EXISTS adjuntos jsonb DEFAULT '[]'::jsonb;

ALTER TABLE encuesta_cateter_vesical
  ADD COLUMN IF NOT EXISTS adjuntos jsonb DEFAULT '[]'::jsonb;

ALTER TABLE encuesta_prevencion_neumonia
  ADD COLUMN IF NOT EXISTS adjuntos jsonb DEFAULT '[]'::jsonb;

-- ------------------------------------------------------------
-- 2. Campos de paciente en encuesta_ronda_cirugia
-- ------------------------------------------------------------
ALTER TABLE encuesta_ronda_cirugia
  ADD COLUMN IF NOT EXISTS identificacion_paciente text,
  ADD COLUMN IF NOT EXISTS nombre_paciente         text;

-- ------------------------------------------------------------
-- 3. Nombre del paciente en encuesta_cateter_vesical
-- ------------------------------------------------------------
ALTER TABLE encuesta_cateter_vesical
  ADD COLUMN IF NOT EXISTS nombre_paciente text;

-- ------------------------------------------------------------
-- 4. lista_chequeo_cvc: boolean → text en encuesta_acceso_venoso
--    (guarda el número de lista / referencia textual)
-- ------------------------------------------------------------
DO $$
BEGIN
  -- Solo ejecuta el cambio si la columna es de tipo boolean
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'encuesta_acceso_venoso'
      AND column_name = 'lista_chequeo_cvc'
      AND data_type = 'boolean'
  ) THEN
    ALTER TABLE encuesta_acceso_venoso
      ALTER COLUMN lista_chequeo_cvc TYPE text
      USING lista_chequeo_cvc::text;
  END IF;
END
$$;

-- Si la columna no existe aún, crearla como text
ALTER TABLE encuesta_acceso_venoso
  ADD COLUMN IF NOT EXISTS lista_chequeo_cvc text;

-- ------------------------------------------------------------
-- 5. semana_mes (integer) en tablas de dispositivos
--    (por si aún no existe)
-- ------------------------------------------------------------
ALTER TABLE encuesta_acceso_venoso
  ADD COLUMN IF NOT EXISTS semana_mes integer;

ALTER TABLE encuesta_cateter_vesical
  ADD COLUMN IF NOT EXISTS semana_mes integer;

ALTER TABLE encuesta_prevencion_neumonia
  ADD COLUMN IF NOT EXISTS semana_mes integer;

-- ------------------------------------------------------------
-- 6. Rol de usuario en user_profiles
-- ------------------------------------------------------------
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS rol text NOT NULL DEFAULT 'auxiliar'
  CHECK (rol IN ('administrador', 'coordinador', 'auxiliar'));

-- Asignar rol administrador al primer usuario (ajusta el email según corresponda)
-- UPDATE user_profiles SET rol = 'administrador' WHERE id = (SELECT id FROM auth.users LIMIT 1);

-- ------------------------------------------------------------
-- 7. Supabase Storage — bucket 'adjuntos'
--    NOTA: Crear manualmente en Supabase Dashboard →
--          Storage → New bucket → nombre: adjuntos → Public: ON
-- ------------------------------------------------------------

-- Policy de acceso al bucket (ejecutar después de crear el bucket en el dashboard)
-- Permite a usuarios autenticados leer y subir archivos:
INSERT INTO storage.buckets (id, name, public)
VALUES ('adjuntos', 'adjuntos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY IF NOT EXISTS "adjuntos_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'adjuntos');

CREATE POLICY IF NOT EXISTS "adjuntos_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'adjuntos' AND auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "adjuntos_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'adjuntos' AND auth.role() = 'authenticated');
