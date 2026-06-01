# Prompt Maestro — Sistema de Control de Infecciones

> Usar este prompt al inicio de una nueva sesión de IA para dar contexto completo del proyecto.

---

## CONTEXTO DEL PROYECTO

Eres un desarrollador senior trabajando en una aplicación web para el **Comité de Infecciones de la Clínica Santa Bárbara (Colombia)**. La app registra y analiza encuestas epidemiológicas hospitalarias.

**URL producción:** `https://juanetayo-projects.github.io/comiteinfecciones/#/dashboard`  
**Repositorio:** `https://github.com/juanetayo-projects/comiteinfecciones`  
**Directorio local:** `C:\Users\Juan Carlos Etayo\comiteinfecciones_new`

---

## STACK TÉCNICO

- **React 18 + Vite 5** — SPA con HashRouter (obligatorio para GitHub Pages)
- **Supabase** (PostgreSQL) — RLS deshabilitado, solo anon key en cliente
- **Tailwind CSS 3** — clases utilitarias + clases globales en `src/index.css`
- **react-hook-form + Zod** — validación de formularios
- **jsPDF + jspdf-autotable** — exportación PDF con logo institucional
- **xlsx** — exportación Excel
- **Recharts** — gráficas en dashboards
- **lucide-react** — iconos

---

## REGLAS CRÍTICAS (NUNCA VIOLAR)

1. **React Rules of Hooks:** TODOS los hooks deben ir ANTES de cualquier `return` condicional.
2. **HashRouter:** Las rutas usan `#/path`. El `main.jsx` intercepta tokens de recovery ANTES del HashRouter.
3. **Sin service role key en cliente:** Para reset de contraseña usar `supabase.auth.resetPasswordForEmail()`.
4. **`.env.local` NUNCA a GitHub:** Solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en cliente.
5. **Columnas GENERATED ALWAYS AS:** NUNCA incluir en payload de insert/update: `resultado_cumplimiento`, `semana_mes`.
6. **Deploy:** `git push origin main` → GitHub Actions despliega automáticamente a `gh-pages`.
7. **Tailwind arbitrario:** Color institucional azul = `bg-[#1a4fa0]`.

---

## CLASES CSS GLOBALES (src/index.css)

```css
.card          → bg-white rounded-xl border border-slate-200 shadow-md
.metric-card   → bg-white rounded-xl border border-slate-200 shadow-lg
.btn-primary   → indigo-600, rounded-lg, con hover
.btn-secondary → blanco con borde slate-200
.input         → borde slate-200, focus ring indigo-500
.label         → text-sm font-medium text-slate-700
.page-title    → text-xl font-bold text-slate-900
```

---

## MÓDULOS DE ENCUESTA

Cada módulo tiene: Lista → Formulario → Dashboard

| Módulo | Tabla Supabase | Ruta |
|--------|---------------|------|
| Higiene de Manos | `encuesta_higiene_manos` | `/encuestas/higiene-manos` |
| Aislamiento | `encuesta_aislamiento` | `/encuestas/aislamiento` |
| Luminometría | `encuesta_luminometria` | `/encuestas/luminometria` |
| Ronda de Cirugía | `encuesta_ronda_cirugia` | `/encuestas/ronda-cirugia` |
| Acceso Venoso (AVP) | `encuesta_acceso_venoso` | `/encuestas/acceso-venoso` |
| Catéter Vesical | `encuesta_cateter_vesical` | `/encuestas/cateter-vesical` |
| Prevención NAV | `encuesta_prevencion_neumonia` | `/encuestas/prevencion-neumonia` |

---

## HOOK useLista (src/hooks/useLista.js)

Lee valores de `listas_desplegables` por `categoria`. Si DB vacía, usa fallback hardcoded.

```js
const servicios = useLista('servicio', SERVICIOS_DEFAULT)
const ubicaciones = useLista('ubicacion', UBICACIONES_DEFAULT)
const tipos = useLista('tipo_aislamiento', TIPOS_DEFAULT)
```

**Categorías en uso:** `servicio`, `ubicacion`, `tipo_aislamiento`, `especialidad`, `objeto`

---

## LISTA OFICIAL DE SERVICIOS

```js
const SERVICIOS = [
  'ATENCIÓN AMBULATORIA', 'BRILLA ASEO', 'CIRUGÍA', 'HEMODINAMIA',
  'HOSPITALIZACIÓN 2', 'HOSPITALIZACIÓN 7', 'HOSPITALIZACIÓN 8', 'HOSPITALIZACIÓN PARCIAL',
  'IMAGENES', 'LABORATORIO', 'REHABILITACIÓN',
  'UCI', 'UCIN', 'URGENCIAS ADULTO', 'URGENCIAS PEDIATRICAS',
]
```

---

## ROLES

- `administrador` — acceso total
- `coordinador` — sin eliminación, acceso a config excepto usuarios
- `auxiliar` — solo lectura y creación

---

## EXPORTACIÓN PDF

```js
// src/lib/exportUtils.js
exportToPDF(data, columns, filename, title, subtitle, kpis?)
// Logo: public/logo_cacsb_blanc.png (blanco sobre banner azul)
// kpis: [{ label, value, pct, count }] → cards verdes (≥80%) o rojas (<80%)
```

---

## FLUJO RESET PASSWORD

```
Admin → ProfileModal → "Enviar link" 
→ resetPasswordForEmail(email, { redirectTo: baseURL })
→ Email con token al usuario
→ main.jsx intercepta hash type=recovery
→ guarda en sessionStorage('supabase_recovery_hash')
→ redirige a #/reset-password
→ ResetPassword.jsx lee token y llama updatePassword()
```

Supabase requiere que `https://juanetayo-projects.github.io/comiteinfecciones/` esté en **Redirect URLs**.

---

## SUPABASE — COLUMNAS GENERATED

Estas columnas las computa la DB automáticamente. **NO enviar en insert/update:**

| Tabla | Columna | Fórmula |
|-------|---------|---------|
| `encuesta_higiene_manos` | `resultado_cumplimiento` | calculado de `sumatoria_cumplimiento` |
| `encuesta_cateter_vesical` | `semana_mes` | `CEIL(DATE_PART('day', fecha_registro) / 7)` |
| `encuesta_prevencion_neumonia` | `semana_mes` | ídem |

---

## ARCHIVOS CLAVE PARA MODIFICAR

| Tarea | Archivo |
|-------|---------|
| Agregar campo a formulario | `src/pages/encuestas/[Nombre]Form.jsx` |
| Agregar opción a lista hardcoded | `src/pages/encuestas/[Nombre]Form.jsx` → constante al tope |
| Cambiar estilos globales | `src/index.css` |
| Cambiar logo/formato PDF | `src/lib/exportUtils.js` |
| Gestionar usuarios | `src/pages/Configuracion.jsx` → ProfileModal |
| Gestionar listas desplegables | `src/pages/Configuracion.jsx` → ListaModal |
| Agregar KPI al dashboard | `src/pages/dashboards/[Nombre]Dashboard.jsx` → KpiCard |
| Agregar encuesta a reportes | `src/pages/Reportes.jsx` |

---

## COMANDOS FRECUENTES

```bash
# Desarrollo local
npm run dev

# Build y verificar
npm run build

# Deploy (automático al hacer push)
git add [archivos]
git commit -m "descripción"
git push origin main

# Ver estado
git status
git log --oneline -5
```

---

## NOTAS DE SUPABASE SQL

- Usar **Run** (Ctrl+Enter), nunca "Explain" para múltiples statements
- `DROP CONSTRAINT IF EXISTS` antes de `ADD CONSTRAINT`
- Crear usuarios en Authentication → Users → "Create new user" → "Auto Confirm User" ANTES de insertar en `user_profiles`
- `TRUNCATE TABLE ... RESTART IDENTITY CASCADE` para limpiar tablas
