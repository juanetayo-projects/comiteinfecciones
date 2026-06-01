# Changelog — Comité de Infecciones

Registro cronológico de todos los ajustes realizados durante el desarrollo.

---

## [v2.6] — 2026-05-31 (sesión actual)

### Corregido
- **ProfileModal:** `loadProfiles()` no incluía `email` en el `SELECT`, causando error "Password recovery requires an email". Agregado `email` al query.
- Email del usuario ahora visible en el modal de edición para confirmar a quién se enviará el link.
- Botón "Enviar link" queda deshabilitado si `profile.email` es undefined (protección extra).

### Agregado
- `CLAUDE.md` — Documentación técnica del proyecto para sesiones de IA.
- `docs/CHANGELOG.md` — Este archivo.
- `docs/PROMPT.md` — Prompt comprensivo del proyecto para nuevas sesiones de IA.
- `docs/SQL_SCRIPTS.md` — Scripts SQL de referencia.

### Cambiado
- **index.css:** `.card` shadow upgrado de `shadow-sm` a `shadow-md` para mayor visibilidad. Agregada clase `.metric-card` con `shadow-lg`.
- **HigieneManosForn:** Agregada opción "No Aplica" a `OPCIONES_MOMENTO` (5 momentos OMS). No suma a la sumatoria de cumplimiento.
- **Lista de servicios:** Todos los formularios actualizados a la lista institucional oficial de 15 servicios.
- **LuminometriaForm:** `SERVICIOS_OBJETOS` actualizado con nuevas claves (CIRUGÍA en lugar de CIRUGIA, hospitalizaciones separadas por piso, urgencias divididas en adulto/pediátrica).

---

## [v2.5] — 2026-05-30

### Agregado
- **ProfileModal:** Botón "Enviar link de restablecimiento de contraseña" reemplaza el campo de contraseña en modo edición.
- Función `handleResetPassword()` usando `supabase.auth.resetPasswordForEmail()`.
- Estado `resetting` (spinner) y `resetSent` (confirmación con CheckCircle2).
- Nota informativa en UsuariosTab actualizada para explicar el nuevo flujo.

---

## [v2.4] — 2026-05-30

### Corregido
- **Script SQL usuarios:** Error UUID al usar placeholders de texto. Reemplazado por `INSERT INTO user_profiles SELECT ... FROM auth.users WHERE email=...`.
- **Constraint `user_profiles_rol_check`:** Secuencia correcta: `DROP CONSTRAINT IF EXISTS` → `UPDATE rows` → `ADD CONSTRAINT`. El `IF EXISTS` es crítico.
- **Columna `encuesta_tipo` NOT NULL:** Agregado `ALTER COLUMN SET DEFAULT 'general'` + `UPDATE` de NULLs.
- **Supabase "Explain" error:** No usar pestaña Explain para múltiples statements — usar "Run" (Ctrl+Enter).

### Agregado
- 4 usuarios del sistema: admin, coordinadora, y 2 auxiliares.
- SQL para vaciar las 8 tablas de encuestas con `TRUNCATE ... RESTART IDENTITY`.

---

## [v2.3] — 2026-05-29

### Agregado
- **Hook `useLista`:** `src/hooks/useLista.js` — lee `listas_desplegables` por categoría, fallback a array hardcoded.
- 7 formularios de encuesta actualizados para usar `useLista` (listas desplegables configurables desde CRUD).
- **Configuracion.jsx:** Campo `encuesta_tipo` en `ListaModal` + `ENCUESTA_TIPOS` constant (8 opciones).

### Cambiado
- **AccesoVenosoForm:** Campo "Lista de Chequeo CVC" cambiado de `<select>` Si/No a `<checkbox>`.

---

## [v2.2] — 2026-05-29

### Corregido
- **exportUtils.js:** Logo PDF cambiado de `logo_cacsb2.png` a `logo_cacsb_blanc.png` (logo blanco).

### Agregado
- **ExportButtons.jsx:** Prop `kpis` para tarjetas de métricas en PDF.
- **exportToPDF:** 6to parámetro `kpis?` — renderiza cards de porcentaje coloreadas antes de la tabla.
- **Reportes.jsx:** `ExportButtons` recibe 7 KPI cards.
- **Dashboard.jsx:** Actividad reciente ahora incluye AVP, Catéter Vesical y Prevención NAV (antes faltaban).

---

## [v2.1] — 2026-05-28

### Agregado
- **Registros.jsx:** Filtros de Servicio y Profesional. Columna "Profesional / Perfil" en tabla. Exportación incluye columna Profesional.

---

## [v2.0] — Sesiones anteriores

### Fundamentos del sistema
- React 18 + Vite + Tailwind + Supabase
- HashRouter para GitHub Pages
- Autenticación Supabase Auth + `user_profiles` con roles
- 7 módulos de encuesta + dashboards individuales
- Exportación PDF (jsPDF + autotable) y Excel (xlsx)
- Kanban por estado
- Sistema de adjuntos (Supabase Storage)
- `main.jsx` intercepta token de recovery para flujo de reset password
- `ResetPassword.jsx` maneja el formulario de nueva contraseña
