# Scripts SQL de Referencia

Scripts para ejecutar en **Supabase SQL Editor → Run** (no usar "Explain").

---

## 1. Actualizar lista de servicios institucionales

```sql
-- Elimina todos los servicios existentes y carga la lista oficial
DELETE FROM listas_desplegables WHERE categoria = 'servicio';

INSERT INTO listas_desplegables (categoria, valor, orden, activo, encuesta_tipo) VALUES
('servicio', 'ATENCIÓN AMBULATORIA',  1,  true, 'general'),
('servicio', 'BRILLA ASEO',           2,  true, 'general'),
('servicio', 'CIRUGÍA',               3,  true, 'general'),
('servicio', 'HEMODINAMIA',           4,  true, 'general'),
('servicio', 'HOSPITALIZACIÓN 2',     5,  true, 'general'),
('servicio', 'HOSPITALIZACIÓN 7',     6,  true, 'general'),
('servicio', 'HOSPITALIZACIÓN 8',     7,  true, 'general'),
('servicio', 'HOSPITALIZACIÓN PARCIAL', 8, true, 'general'),
('servicio', 'IMAGENES',              9,  true, 'general'),
('servicio', 'LABORATORIO',           10, true, 'general'),
('servicio', 'REHABILITACIÓN',        11, true, 'general'),
('servicio', 'UCI',                   12, true, 'general'),
('servicio', 'UCIN',                  13, true, 'general'),
('servicio', 'URGENCIAS ADULTO',      14, true, 'general'),
('servicio', 'URGENCIAS PEDIATRICAS', 15, true, 'general');
```

---

## 2. Crear perfil de usuario (después de crear en Auth)

```sql
-- Ejecutar DESPUÉS de crear el usuario en Authentication → Users
INSERT INTO user_profiles (id, nombre, email, rol, activo)
SELECT u.id, 'Nombre Completo', u.email, 'auxiliar', true
FROM auth.users u
WHERE u.email = 'correo@hospital.com';
```

---

## 3. Corregir constraint de roles

```sql
-- Secuencia correcta para actualizar el constraint de roles
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_rol_check;
UPDATE user_profiles SET rol = 'auxiliar' WHERE rol NOT IN ('administrador','coordinador','auxiliar');
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_rol_check
  CHECK (rol IN ('administrador','coordinador','auxiliar'));
```

---

## 4. Configurar default de encuesta_tipo en listas_desplegables

```sql
ALTER TABLE listas_desplegables ALTER COLUMN encuesta_tipo SET DEFAULT 'general';
UPDATE listas_desplegables SET encuesta_tipo = 'general' WHERE encuesta_tipo IS NULL;
```

---

## 5. Vaciar tablas de encuestas (inicio de producción)

```sql
-- ADVERTENCIA: Elimina TODOS los datos de encuestas
TRUNCATE TABLE
  encuesta_higiene_manos,
  encuesta_aislamiento,
  encuesta_luminometria,
  encuesta_ronda_cirugia,
  encuesta_acceso_venoso,
  encuesta_cateter_vesical,
  encuesta_prevencion_neumonia,
  archivos_adjuntos
RESTART IDENTITY CASCADE;
```

---

## 6. Verificar usuarios y perfiles

```sql
-- Ver todos los perfiles con su email
SELECT up.id, up.nombre, up.email, up.rol, up.activo, au.email as auth_email
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
ORDER BY up.nombre;
```

---

## 7. Actualizar datos de usuario

```sql
UPDATE user_profiles
SET nombre = 'Nombre Completo',
    apellido = 'Apellido',
    rol = 'coordinador'
WHERE email = 'correo@hospital.com';
```
