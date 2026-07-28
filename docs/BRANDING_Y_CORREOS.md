# Branding, Sistema de Diseño Neumórfico y Correos de Autenticación

Última actualización: 2026-07-28

---

## 1. Paleta de marca

Definida en `tailwind.config.js` (`theme.extend.colors`). Reemplaza la antigua paleta
`indigo/slate` pálida.

### `brand` — azul institucional CACSB (ramp completo)

| Token | HEX | Uso |
|-------|-----|-----|
| `brand-50`  | `#eef5ff` | fondos suaves |
| `brand-100` | `#d9e8ff` | chips, badges |
| `brand-200` | `#b8d4ff` | |
| `brand-300` | `#8ab8ff` | |
| `brand-400` | `#5593f5` | rings de foco |
| `brand-500` | `#2f6fe4` | acentos |
| `brand-600` | `#1f56c4` | **acción primaria** |
| `brand-700` | `#1a4fa0` | azul institucional histórico |
| `brand-800` | `#16468e` | títulos de sección |
| `brand-900` | `#0d2d6b` | títulos de página |
| `brand-950` | `#081c45` | fondo login |

### `accent` — turquesa (secundario vistoso)

`accent-400 #22d3ee` · `accent-500 #06b6d4` · `accent-600 #0891b2`

Se usa en el avatar del header, el borde del submenú de encuestas y el icono de
ResetPassword.

### Colores semánticos

- CUMPLE / éxito → `emerald` + `teal` (barras: `#059669`)
- NO CUMPLE / error → `rose` (barras: `#e11d48`)
- Advertencia → `amber` + `orange`

### Gradientes (`theme.extend.backgroundImage`)

| Clase | Uso |
|-------|-----|
| `bg-brand-gradient` | botones primarios, header, banners de sección, cabeceras de tabla |
| `bg-accent-gradient` | avatar, icono de ResetPassword |
| `bg-neu-surface` | superficie elevada (cards, modales) |
| `bg-neu-page` | fondo de página |

---

## 2. Sistema neumórfico

Base: superficie `#e9eef7` con luz superior-izquierda y sombra inferior-derecha.

### Sombras (`theme.extend.boxShadow`)

| Clase | Efecto |
|-------|--------|
| `shadow-neu-xs` / `-sm` / `shadow-neu` / `-lg` | relieve creciente |
| `shadow-neu-hover` | relieve al pasar el cursor |
| `shadow-neu-in-xs` / `-in` / `-in-lg` | hundido (inputs, tracks, estado activo) |
| `shadow-neu-dark` / `-dark-in` | relieve sobre superficies azul oscuro (sidebar, login) |
| `shadow-brand-glow` / `shadow-accent-glow` | halo de color en botones |

### Clases de componente (`src/index.css`)

| Clase | Descripción |
|-------|-------------|
| `.card` | superficie elevada, `rounded-2xl` + `shadow-neu` |
| `.card-hover` | añade `shadow-neu-hover` al hover |
| `.metric-card` | como `.card` con `shadow-neu-lg` |
| `.neu-raised` / `.neu-inset` / `.neu-pill` | utilidades sueltas |
| `.input` | campo hundido, sin borde, foco con ring `brand-400` |
| `.btn-primary` | gradiente de marca + relieve; al pulsar se hunde |
| `.btn-secondary` | relieve neutro |
| `.btn-danger` | gradiente rosa/rojo |
| `.btn-accent` | gradiente turquesa |
| `.kpi-tile` + `.kpi-{brand,indigo,emerald,red,amber,cyan,violet,purple,blue,slate}` | tarjetas KPI con tinte y relieve |
| `.table-head-brand` | cabecera de tabla con gradiente de marca |

**Regla:** para mantener la coherencia, usar siempre estas clases en vez de
`bg-white` + `shadow-md`. El neumorfismo necesita que el fondo de la página NO sea
blanco puro — por eso `body` usa `bg-neu-page`.

---

## 3. Recuperación de contraseña desde el login

`src/pages/Login.jsx` tiene dos modos (`mode`: `'login'` | `'recover'`):

1. El usuario pulsa **"¿Olvidaste tu contraseña?"**.
2. Ingresa su correo → `resetPasswordForEmail(email)` de `AuthContext`.
3. `AuthContext` llama `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
   con `redirectTo = window.location.href.split('#')[0]` (base URL sin hash).
4. `main.jsx` intercepta el token del hash y redirige a `#/reset-password`.
5. `ResetPassword.jsx` restaura la sesión y actualiza la contraseña.

Sigue existiendo la vía del administrador desde `Configuración → Usuarios → Editar`.

**Requisito Supabase:** `https://juanetayo-projects.github.io/comiteinfecciones/`
debe estar en *Authentication → URL Configuration → Redirect URLs*.

---

## 4. Nombre del remitente de los correos (quitar "Supabase Auth")

> ⚠️ Esto **no se configura desde el código**. El remitente lo define el servidor
> de correo del proyecto Supabase. Con el SMTP por defecto de Supabase el remitente
> es siempre `Supabase Auth <noreply@mail.app.supabase.io>` y no se puede cambiar.

Proyecto Supabase: **`goveebafgbjnffhcectu`**

### Paso 1 — Activar SMTP propio

Dashboard de Supabase → **Project Settings → Authentication → SMTP Settings** →
*Enable Custom SMTP*.

Con Resend (mismo proveedor usado en los otros proyectos de la clínica):

| Campo | Valor |
|-------|-------|
| Host | `smtp.resend.com` |
| Port | `465` (SSL) o `587` (TLS) |
| Username | `resend` |
| Password | la API key de Resend (`re_...`) |
| **Sender email** | `no-responder@cacsantabarbara.co` |
| **Sender name** | `Comité de Infecciones — Clínica Santa Bárbara` |

El dominio `cacsantabarbara.co` debe estar verificado en Resend (registros SPF/DKIM).

### Paso 2 — Personalizar las plantillas

Dashboard → **Authentication → Email Templates → Reset Password**.

Asunto sugerido:

```
Restablece tu contraseña — Comité de Infecciones
```

Cuerpo sugerido (HTML):

```html
<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#1f56c4,#1a4fa0 55%,#0d2d6b);
              padding:24px;border-radius:16px 16px 0 0;text-align:center">
    <h1 style="color:#fff;font-size:18px;margin:0">Comité de Infecciones</h1>
    <p style="color:#a5f3fc;font-size:13px;margin:4px 0 0">
      Clínica de Alta Complejidad Santa Bárbara
    </p>
  </div>
  <div style="background:#eff3fa;padding:24px;border-radius:0 0 16px 16px;color:#334155">
    <p>Hola,</p>
    <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
    <p style="text-align:center;margin:24px 0">
      <a href="{{ .ConfirmationURL }}"
         style="background:#1f56c4;color:#fff;padding:12px 24px;border-radius:12px;
                text-decoration:none;font-weight:600;display:inline-block">
        Restablecer mi contraseña
      </a>
    </p>
    <p style="font-size:12px;color:#64748b">
      El enlace caduca en 1 hora. Si no solicitaste este cambio, ignora este correo.
    </p>
  </div>
</div>
```

**Verificación:** tras guardar, pedir un enlace desde el login y confirmar que el
correo llega como *Comité de Infecciones — Clínica Santa Bárbara* y no como
*Supabase Auth*.

---

## 4-bis. Normalización a MAYÚSCULAS de catálogos y registros

Los gráficos partían una misma categoría en dos porque los datos importados
usaban Title Case ("Urgencias Adultos") y los catálogos mayúsculas
("URGENCIAS ADULTO").

**Migración aplicada (2026-07-28)** — `normalizar_mayusculas_listas_y_registros`:

| Antes | Ahora | Registros |
|-------|-------|-----------|
| `Hospitalización Piso 2/7/8` | `HOSPITALIZACIÓN 2/7/8` | 20 |
| `UCI Adultos` | `UCI` | 6 |
| `Urgencias Adultos` | `URGENCIAS ADULTO` | 15 |
| `Cirugía` | `CIRUGÍA` | 5 |
| `Aislamiento por Contacto` | `CONTACTO` | 8 |
| `Aislamiento Respiratorio / Aerosoles` | `VIA AEREA` | 2 |
| `Aislamiento de Protección / Inverso` | `PROTECTOR` | 1 |
| `Bomba de infusion` | `BOMBA DE INFUSIÓN` | 2 |

Además: `upper()` sobre las 148 filas de `listas_desplegables` y sobre los
campos de catálogo de todas las tablas de encuesta; se borraron los 6 duplicados
Title-Case de `tipo_aislamiento`.

**Respaldo:** tablas `backup_20260728_listas_desplegables`,
`backup_20260728_aislamiento`, `backup_20260728_luminometria`.

### Para que no vuelva a ocurrir

1. `Configuracion.jsx` guarda `valor.trim().toUpperCase()` en los catálogos.
2. Los catálogos embebidos en los formularios (`SERVICIOS_OBJETOS` de
   `LuminometriaForm`, `QUIROFANOS_POR_SERVICIO` de `RondaCirugiaForm`) están en
   mayúsculas.

### Pendiente de criterio clínico (NO se tocó)

Valores parecidos pero no equivalentes, que requieren decisión del comité:

- Luminometría → objeto: `CAMILLA` vs `CAMILLA DE URGENCIAS`;
  `VENTILADOR` vs `VENTILADOR MECÁNICO`; `MESA DE MAYO` (no está en el catálogo).
- Aislamiento → profesional: los registros usan `AUXILIAR`, `MEDICO`,
  `ENFERMERA (O)`… mientras el catálogo `profesional` usa
  `AUXILIAR DE ENFERMERÍA`, `MÉDICO GENERAL`… Son vocabularios distintos, no un
  problema de mayúsculas.

---

## 5. Filtros en las vistas de tabla

`src/components/common/TableFilters.jsx` expone:

- `useTableFilters(data, config)` → `{ values, setF, clear, filtered, options, hasFilters, summary }`
- `<TableFilters config values setF clear options hasFilters total shown />`

Tipos de campo: `daterange` (dos inputs date) y `select` (opciones únicas del
dataset, o fijas vía `options`).

`filtered` alimenta **tanto** a `<DataTable>` como a `<ExportButtons>`, de modo
que lo exportado es exactamente lo que se ve; `summary` va como subtítulo del
PDF/Excel para dejar constancia de los filtros aplicados.

Filtros por encuesta:

| Encuesta | Filtros |
|----------|---------|
| Aislamiento | Fecha, Servicio, Profesional, Tipo Aislamiento, Adherencia, Estado |
| Higiene de Manos | Fecha, Servicio, Perfil, Resultado, Estado |
| Luminometría | Fecha, Servicio, Superficie, Clasificación, Estado |
| Ronda de Cirugía | Fecha, Servicio, Quirófano, Especialidad, Profesional, Profilaxis, Estado |
| AVP / Catéter Vesical / NAV | Fecha, Ubicación/Cama, Estado |

---

## 6. Exportar dashboards a PDF (vista de pantalla)

`exportDashboardToPDF(element, { filename, title, subtitle, filtros })` en
`src/lib/exportUtils.js`, con el botón `<DashboardPdfButton targetRef … />`.

- Captura el dashboard con **html2canvas** (`scale: 2`, fondo `#e9eef7`), por lo
  que el PDF conserva gráficas, colores y neumorfismo tal como en pantalla.
- Antepone la banda azul institucional con logo, el **título**, el subtítulo y un
  recuadro con los **filtros aplicados** (o "ninguno").
- Si el dashboard no cabe en una página, recorta el canvas y pagina, repitiendo
  una cabecera compacta.
- Pie de página con numeración en todas las páginas.
- Los elementos con `data-pdf-hide` (botón de exportar, panel de filtros) se
  omiten de la captura porque ya están resumidos en el encabezado.

`filtrosResumen(filters, labels)` de `lib/utils.js` convierte el estado de
filtros del dashboard en el listado legible que se imprime.

---

### Notas de implementación del PDF

- **El velo gris**: html2canvas clona el DOM y eso *reinicia* las animaciones CSS.
  Como el contenedor lleva `.animate-fade-in` (que arranca en `opacity: 0`), la
  captura salía siendo sólo el fondo gris. En `onclone` se inyecta un `<style>`
  que anula `animation`/`transition` y fuerza `opacity: 1`.
- El logo se dibuja con `drawLogoFitted()`, que respeta la proporción real
  (1909×538 ≈ 3,55:1); antes se forzaba a un cuadro de 20×20 mm y se aplastaba.

---

## 6-bis. Exportación a Excel

`exportToExcel(data, columns, filename, title, subtitle, filtros)` usa **ExcelJS**
(SheetJS en su versión comunidad no permite insertar imágenes).

Estructura del archivo:

| Filas | Contenido |
|-------|-----------|
| 1–3 | Banda azul institucional con el **logo** (proporción respetada) |
| 4–5 | Nombre de la clínica y "Comité de Infecciones" |
| 7 | **Título** del reporte |
| 8 | Subtítulo |
| 9 | **Filtros aplicados** (recuadro gris con barra azul lateral) |
| 10 | Fecha de generación y número de registros |
| 12 | Cabecera de la tabla (azul de marca, texto blanco) |
| 13+ | Datos con filas alternas |

Además: paneles congelados hasta la cabecera, autofiltro y anchos de columna.

> `xlsx` (SheetJS) se **desinstaló** al quedar sin uso; con ello desaparece su
> vulnerabilidad alta de prototype pollution.

### Carga diferida

ExcelJS (939 kB), jsPDF (357 kB) y html2canvas (201 kB) se importan
dinámicamente dentro de las funciones de exportación. El bundle principal bajó de
2.894 kB a **1.351 kB** (menos incluso que los 2.014 kB previos a ExcelJS).

---

## 7. Actividad Reciente del dashboard

Cada entrada muestra ahora:

- Tipo de encuesta y servicio/ubicación.
- Chips con los datos relevantes según la encuesta (tipo de aislamiento,
  profesional, evaluado, perfil, momentos OMS, objeto y RLU, quirófano,
  especialidad, paciente, número de accesos/casos).
- **Quién la diligenció** — `registrado_por` resuelto contra `user_profiles`.
- Fecha de la encuesta y marca de tiempo del registro.
- Badge de resultado (Cumple / No Cumple) y badge del estado del flujo.

---

## 8. Porcentajes en las gráficas de Aislamiento

`src/pages/dashboards/AislamentoDashboard.jsx`:

- `buildBarData()` calcula `pctCumple` y `pctNoCumple` por categoría.
- `SegmentLabel` dibuja el % **dentro** de cada segmento apilado (se omite si el
  segmento mide menos de 16 px de alto).
- `TotalPctLabel` dibuja el % de adherencia **encima** de la barra, en verde si
  ≥ 80 % y en rojo si es menor.
- `BarTooltip` muestra conteo + % de cada segmento y el total.
- El pie de "Adherencia Global" muestra `NOMBRE conteo (%)`.

Las gráficas usan `isAnimationActive={false}` a propósito: Recharts sólo pinta las
etiquetas al terminar la animación, y en un tablero de análisis el porcentaje debe
verse de inmediato.

### Aplicado al resto de dashboards

Los helpers viven en `src/lib/chartLabels.jsx` y se reutilizan en los 8 dashboards:

| Helper | Uso |
|--------|-----|
| `buildBarData(rows, key, fallback, isCumple)` | agrupa y calcula `pctCumple` / `pctNoCumple` |
| `withCriterioPct(rows)` | añade los % a series que ya traen `cumple` / `noCumple` |
| `withPct(rows, key, total)` | añade `pct` y `etiqueta` "N (P%)" a series simples |
| `SegmentLabel` | % dentro de cada segmento apilado (se omite si mide <16 px) |
| `TotalPctLabel` | % de adherencia sobre la barra (verde ≥80 %, rojo <80 %) |
| `TopLabel` | etiqueta de texto sobre barras no apiladas |
| `BarTooltip` | tooltip con conteo y % por segmento |

Casos particulares:

- **Ronda de Cirugía** apila 3 series (CUMPLE / NO CUMPLE / NO APLICA): se
  etiqueta el % de cada segmento y arriba el % de cumplimiento.
- **Luminometría → Promedio RLU por objeto**: el promedio RLU es una magnitud, no
  un porcentaje; la etiqueta muestra `RLU · % que cumple` (`<100 RLU`).
- **Higiene → Distribución sumatoria** y **Ronda → Registros por quirófano**:
  barras de conteo, etiquetadas como `N (P%)` sobre el total.
