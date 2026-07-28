# Comité de Infecciones — CLAUDE.md

Documentación técnica del proyecto para sesiones de IA. Última actualización: 2026-05-31.

---

## 1. Resumen del Proyecto

**Nombre:** Sistema de Control de Infecciones — Clínica Santa Bárbara  
**URL producción:** `https://juanetayo-projects.github.io/comiteinfecciones/#/dashboard`  
**Repositorio:** `https://github.com/juanetayo-projects/comiteinfecciones`  
**Rama principal:** `main` (push → GitHub Actions → deploy automático a `gh-pages`)

App SaaS hospitalaria para el comité de infecciones. Registra y analiza encuestas de vigilancia epidemiológica: higiene de manos, aislamientos, luminometría, rondas de cirugía, acceso venoso, catéter vesical y prevención de neumonía asociada a ventilación (NAV).

---

## 2. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite 5 |
| Routing | react-router-dom v6 — **HashRouter** (GitHub Pages) |
| Formularios | react-hook-form + Zod |
| Base de datos | Supabase (PostgreSQL) — RLS deshabilitado intencionalmente |
| Estilos | Tailwind CSS 3 — **sistema neumórfico**, ver `docs/BRANDING_Y_CORREOS.md` |
| Gráficas | Recharts |
| PDF export | jsPDF + jspdf-autotable |
| Excel export | xlsx |
| Drag & drop | @hello-pangea/dnd |
| Iconos | lucide-react |

---

## 3. Estructura de Archivos

```
src/
├── main.jsx                    # Intercepta token de recovery ANTES del HashRouter
├── App.jsx                     # Rutas y ProtectedRoute
├── index.css                   # Tailwind + clases globales (.card, .btn-primary, etc.)
├── contexts/
│   └── AuthContext.jsx          # useAuth() → { user, rol, loading }
├── hooks/
│   └── useLista.js             # Lee listas_desplegables de Supabase con fallback hardcoded
├── lib/
│   ├── supabase.js             # Cliente Supabase (anon key)
│   ├── exportUtils.js          # exportToPDF(data, columns, filename, title, subtitle, kpis?)
│   └── utils.js                # Helpers generales
├── components/
│   ├── common/
│   │   ├── DataTable.jsx       # Tabla reutilizable con paginación
│   │   ├── ExportButtons.jsx   # Botones PDF + Excel (recibe kpis prop)
│   │   ├── FileUpload.jsx      # Upload a Supabase Storage
│   │   ├── AdjuntosModal.jsx   # Modal visor de adjuntos
│   │   └── ProtectedRoute.jsx  # Redirige si no autenticado
│   └── layout/
│       ├── Layout.jsx          # Shell: Header + Sidebar + <Outlet>
│       ├── Header.jsx          # Top bar con avatar y menú
│       └── Sidebar.jsx         # Navegación lateral
└── pages/
    ├── Login.jsx
    ├── ResetPassword.jsx       # Lee token de sessionStorage → updatePassword()
    ├── Dashboard.jsx           # KPIs globales + actividad reciente (7 encuestas)
    ├── Registros.jsx           # Vista unificada de todos los registros + filtros
    ├── Reportes.jsx            # Reportes con KPI cards exportables a PDF/Excel
    ├── Kanban.jsx              # Vista Kanban por estado
    ├── Configuracion.jsx       # Tabs: Usuarios, Listas, Archivos, Email Logs
    ├── Usuarios.jsx            # (legacy, ver Configuracion.jsx)
    ├── dashboards/
    │   ├── HigieneDashboard.jsx
    │   ├── AislamentoDashboard.jsx
    │   ├── LuminometriaDashboard.jsx
    │   ├── RondaDashboard.jsx
    │   ├── AccesoVenasoDashboard.jsx
    │   ├── CateterVesicalDashboard.jsx
    │   ├── PrevencionNeumoniaDashboard.jsx
    │   └── DispositivosDashboard.jsx
    └── encuestas/
        ├── HigieneManos.jsx + HigieneManosForn.jsx
        ├── Aislamiento.jsx + AislamientoForm.jsx
        ├── Luminometria.jsx + LuminometriaForm.jsx
        ├── RondaCirugia.jsx + RondaCirugiaForm.jsx
        ├── AccesoVenoso.jsx + AccesoVenosoForm.jsx
        ├── CateterVesical.jsx + CateterVesicalForm.jsx
        ├── PrevencionNeumonia.jsx + PrevencionNeumoniaForm.jsx
        └── SeguimientoDispositivos.jsx + SeguimientoDispositivosForm.jsx
```

---

## 4. Tablas Supabase

| Tabla | Descripción |
|-------|-------------|
| `user_profiles` | Perfil de usuario: id, nombre, email, rol, activo |
| `listas_desplegables` | Catálogos configurables: categoria, valor, orden, activo, encuesta_tipo |
| `encuesta_higiene_manos` | 5 momentos OMS — resultado_cumplimiento (GENERATED AS) |
| `encuesta_aislamiento` | Criterios de aislamiento hospitalario |
| `encuesta_luminometria` | Mediciones ATP (RLU) — rango calculado |
| `encuesta_ronda_cirugia` | Ronda de seguridad quirúrgica |
| `encuesta_acceso_venoso` | Acceso venoso periférico (AVP) |
| `encuesta_cateter_vesical` | Catéter urinario — semana_mes (GENERATED AS) |
| `encuesta_prevencion_neumonia` | NAV — semana_mes (GENERATED AS) |
| `archivos_adjuntos` | Registro de archivos subidos (metadata) |
| `email_logs` | Log de emails enviados |

### Columnas GENERATED ALWAYS AS (NO enviar en payload):
- `encuesta_higiene_manos.resultado_cumplimiento` — calculado de `sumatoria_cumplimiento`
- `encuesta_cateter_vesical.semana_mes` — calculado de `fecha_registro`
- `encuesta_prevencion_neumonia.semana_mes` — calculado de `fecha_registro`

---

## 5. Roles de Usuario

| Rol | Acceso |
|-----|--------|
| `administrador` | Acceso total — puede crear/editar/eliminar usuarios y configuración |
| `coordinador` | Sin eliminación — acceso a configuración (sin usuarios) |
| `auxiliar` | Solo lectura y creación de registros |

Constraint en DB: `user_profiles_rol_check CHECK (rol IN ('administrador','coordinador','auxiliar'))`

### RLS de las tablas `encuesta_*`

Políticas `<tabla>_sel|_ins|_upd|_del`, apoyadas en `puede_editar_encuesta(registrado_por, estado)`:

| Operación | Quién |
|-----------|-------|
| ver | cualquier usuario autenticado |
| crear | cualquier usuario autenticado (queda como `registrado_por`) |
| **editar** | dueño, coordinador o administrador, **sólo si el estado NO es `validado` ni `cerrado`**. El administrador puede editar siempre. |
| eliminar | sólo administrador |

> ⚠️ **Un UPDATE bloqueado por RLS NO devuelve error**: PostgREST responde 204 y
> actualiza 0 filas. Por eso todo guardado va por `guardarEncuesta()`
> (`src/lib/guardarEncuesta.js`), que añade `.select()` y avisa si no se afectó
> ninguna fila. Nunca llamar a `.update()` directamente desde un formulario.

---

## 6. Hook useLista

```js
// src/hooks/useLista.js
export function useLista(categoria, fallback = []) {
  const [items, setItems] = useState(fallback)
  useEffect(() => {
    supabase.from('listas_desplegables').select('valor')
      .eq('categoria', categoria).order('valor')
      .then(({ data }) => {
        const vals = (data ?? []).map(r => r.valor).filter(Boolean)
        if (vals.length > 0) setItems(vals)
      })
  }, [categoria])
  return items
}
```

**Categorías usadas:**
- `'servicio'` — HigieneManos, Aislamiento, Luminometria, RondaCirugia
- `'ubicacion'` — AccesoVenoso, CateterVesical, PrevencionNeumonia
- `'tipo_aislamiento'` — AislamientoForm
- `'especialidad'` — RondaCirugiaForm
- `'objeto'` — LuminometriaForm (fallback para objetos no mapeados)

---

## 7. Lista de Servicios Institucionales

Lista oficial en `listas_desplegables` categoria = `'servicio'`:

```
ATENCIÓN AMBULATORIA
BRILLA ASEO
CIRUGÍA
HEMODINAMIA
HOSPITALIZACIÓN 2
HOSPITALIZACIÓN 7
HOSPITALIZACIÓN 8
HOSPITALIZACIÓN PARCIAL
IMAGENES
LABORATORIO
REHABILITACIÓN
UCI
UCIN
URGENCIAS ADULTO
URGENCIAS PEDIATRICAS
```

---

## 8. Flujo de Reset de Contraseña

Dos vías de entrada:

- **Usuario final:** botón "¿Olvidaste tu contraseña?" en `Login.jsx` → modo `recover`
  → `resetPasswordForEmail(email)` de `AuthContext`.
- **Administrador:** `Configuracion → Usuarios → Editar usuario`.

Desde ahí el flujo es el mismo:

1. Admin abre `Configuracion → Usuarios → Editar usuario`
2. Hace clic en "Enviar link de restablecimiento"
3. App llama `supabase.auth.resetPasswordForEmail(email, { redirectTo: baseURL })`
4. Supabase envía email con token de recovery
5. Usuario hace clic → navega a la app con hash `#access_token=...&type=recovery`
6. `main.jsx` intercepta el hash ANTES del HashRouter, guarda en `sessionStorage` como `supabase_recovery_hash`
7. Redirige a `#/reset-password`
8. `ResetPassword.jsx` lee el hash, llama `setSession()` y `updatePassword()`

**Requisito Supabase:** URL `https://juanetayo-projects.github.io/comiteinfecciones/` debe estar en Authentication → URL Configuration → Redirect URLs.

**Remitente del correo:** con el SMTP por defecto llega como "Supabase Auth". Para que
llegue como "Comité de Infecciones — Clínica Santa Bárbara" hay que activar SMTP propio
(Resend) en el dashboard de Supabase — ver `docs/BRANDING_Y_CORREOS.md` §4. **No es
configurable desde el código.**

---

## 9. Exportación PDF

Función: `exportToPDF(data, columns, filename, title, subtitle, kpis?)`

- Logo: `public/logo_cacsb_blanc.png` (logo blanco sobre banner azul `#1a4fa0`)
- Si `kpis` presente: renderiza tarjetas de métricas con color (verde ≥80%, rojo <80%) antes de la tabla
- `tableStartY` se ajusta automáticamente según presencia de kpis (+26mm)

---

## 10. Reglas Críticas de Desarrollo

1. **React Rules of Hooks:** TODOS los hooks (useMemo, useState, useEffect, useLista) deben ir ANTES de cualquier return condicional.
2. **Sin service role key en cliente:** Para cambios de contraseña usar `resetPasswordForEmail()`.
3. **`.env.local` nunca a GitHub:** Solo `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
4. **HashRouter:** Todas las rutas usan `#/path` — obligatorio para GitHub Pages.
5. **Columnas GENERATED:** Nunca incluir en payload de insert/update.
6. **Deploy:** `git push origin main` → GitHub Actions deploya automáticamente.
7. **Diseño neumórfico:** usar `.card`, `.input`, `.btn-*`, `.kpi-tile` y los tokens
   `brand-*` / `accent-*` / `shadow-neu-*`. Nunca `bg-white` + `shadow-md` sueltos, ni
   la paleta `indigo` antigua. El fondo de página no puede ser blanco puro.
8. **Catálogos SIEMPRE en MAYÚSCULAS:** `listas_desplegables.valor` y los catálogos
   embebidos en los formularios. Un mismo valor en dos capitalizaciones parte la
   categoría en dos en las gráficas. Ver `docs/BRANDING_Y_CORREOS.md` §4-bis.
9. **Filtros de tabla:** usar `useTableFilters` + `<TableFilters>` y pasar
   `ft.filtered` tanto a `<DataTable>` como a `<ExportButtons>`, para que lo
   exportado coincida con lo que se ve.
10. **Etiquetas de % en gráficas:** usar los helpers de `src/lib/chartLabels.jsx`,
    no reimplementarlos. Las gráficas con etiquetas van con
    `isAnimationActive={false}`.
11. **PDF de dashboards:** `<DashboardPdfButton targetRef={pdfRef} …>` sobre el
    contenedor de la vista; marcar con `data-pdf-hide` lo que no deba capturarse.
12. **Guardar encuestas:** siempre con `guardarEncuesta(tabla, payload, id)`. Al
    editar NO se envía `registrado_por` (reescribirlo robaba la autoría y rompía
    las políticas de RLS).
13. **Registros validados:** `esEditable(estado, rol)` decide si el formulario se
    abre en modo consulta (`<fieldset disabled>` + `<BannerSoloLectura>`) y si la
    lista muestra el icono de lápiz o de ojo. Debe coincidir con la RLS.
14. **Luminometría sin insumos:** el servicio `COMITÉ DE INFECCIONES`
    (`SERVICIO_SIN_MEDICION`) documenta que la medición no pudo hacerse: sólo pide
    Observaciones y guarda `rango = 'NO APLICA'`. El dashboard excluye esos
    registros del cálculo de adherencia y del promedio de RLU.

---

## 11. Variables de Entorno

```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
```

Solo la `anon key` (pública) va en el cliente. La `service role key` es SENSIBLE — nunca en código cliente.
