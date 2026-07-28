import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate, formatDateTime, porcentaje, estadoBadgeColor, estadoLabel } from '../lib/utils'
import {
  ShieldAlert, Hand, Microscope, Stethoscope, Activity,
  TrendingUp, TrendingDown, Clock, CheckCircle2, AlertCircle,
  Syringe, Droplets, Wind, User, CalendarDays,
} from 'lucide-react'

// ─── Configuración de encuestas ─────────────────────────────────────────────
const ENCUESTAS_CFG = {
  aislamiento:  { label: 'Aislamiento',      color: 'red',     icon: ShieldAlert,  border: 'border-l-red-400'    },
  higiene:      { label: 'Higiene de Manos', color: 'blue',    icon: Hand,         border: 'border-l-blue-400'   },
  luminometria: { label: 'Luminometría',     color: 'amber',   icon: Microscope,   border: 'border-l-amber-400'  },
  ronda:        { label: 'Ronda Cirugía',    color: 'purple',  icon: Stethoscope,  border: 'border-l-purple-400' },
  dispositivos: { label: 'Dispositivos',     color: 'emerald', icon: Activity,     border: 'border-l-emerald-400'},
  avp:          { label: 'Acceso Venoso',    color: 'indigo',  icon: Syringe,      border: 'border-l-brand-400' },
  cv:           { label: 'Catéter Vesical',  color: 'cyan',    icon: Droplets,     border: 'border-l-cyan-400'   },
  pn:           { label: 'Prevención NAV',   color: 'violet',  icon: Wind,         border: 'border-l-violet-400' },
}

const FILTROS = [
  { value: '',             label: 'Todas',            activeCls: 'bg-brand-gradient text-white shadow-brand-glow',                              hoverCls: 'hover:text-brand-700'   },
  { value: 'aislamiento',  label: 'Aislamiento',      activeCls: 'bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-neu-sm',        hoverCls: 'hover:text-rose-700'    },
  { value: 'higiene',      label: 'Higiene de Manos', activeCls: 'bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-neu-sm',         hoverCls: 'hover:text-blue-700'    },
  { value: 'luminometria', label: 'Luminometría',     activeCls: 'bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-neu-sm',     hoverCls: 'hover:text-amber-700'   },
  { value: 'ronda',        label: 'Ronda Cirugía',    activeCls: 'bg-gradient-to-br from-violet-500 to-purple-700 text-white shadow-neu-sm',    hoverCls: 'hover:text-purple-700'  },
  { value: 'dispositivos', label: 'Dispositivos',     activeCls: 'bg-gradient-to-br from-teal-400 to-emerald-700 text-white shadow-neu-sm',     hoverCls: 'hover:text-emerald-700' },
]

const KPI_SUBTITLES = {
  '':             { total: 'Suma de todos los tipos de encuesta', pct: 'Evaluaciones con CUMPLE ÷ total evaluaciones' },
  aislamiento:    { total: 'Encuestas de aislamiento registradas', pct: 'Aislamientos CUMPLE ÷ total aislamiento' },
  higiene:        { total: 'Observaciones de higiene registradas', pct: 'Observaciones CUMPLE (5/5 momentos) ÷ total' },
  luminometria:   { total: 'Mediciones RLU registradas',          pct: 'Mediciones CUMPLE (≤100 RLU) ÷ total mediciones' },
  ronda:          { total: 'Rondas de cirugía registradas',       pct: 'Rondas con profilaxis CUMPLE ÷ total rondas' },
  dispositivos:   { total: 'Registros AVP + CV + NAV combinados',  pct: 'Índice de adherencia (en construcción)' },
}

// ─── Componentes ─────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = 'indigo', icon: Icon }) {
  const colors = {
    indigo:  { tile: 'kpi-brand',   text: 'text-brand-800',   icon: 'from-brand-500 to-brand-800'      },
    emerald: { tile: 'kpi-emerald', text: 'text-emerald-800', icon: 'from-teal-400 to-emerald-700'     },
    amber:   { tile: 'kpi-amber',   text: 'text-amber-800',   icon: 'from-amber-400 to-orange-600'     },
    red:     { tile: 'kpi-red',     text: 'text-rose-800',    icon: 'from-rose-400 to-rose-700'        },
    slate:   { tile: 'kpi-slate',   text: 'text-slate-700',   icon: 'from-slate-400 to-slate-600'      },
  }
  const c = colors[color] ?? colors.indigo
  return (
    <div className={`kpi-tile p-4 flex items-center gap-4 ${c.tile}`}>
      {Icon && (
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-neu-xs bg-gradient-to-br ${c.icon}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      )}
      <div>
        <p className={`text-2xl font-extrabold ${c.text}`}>{value}</p>
        <p className="text-xs text-slate-600 font-semibold">{label}</p>
        {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
      </div>
    </div>
  )
}

function EncuestaCard({ to, icon: Icon, label, total, pct, color, selected }) {
  const isGood = pct >= 80
  const accents = {
    red:     { bar: 'border-l-rose-500',    icon: 'from-rose-400 to-rose-700'    },
    blue:    { bar: 'border-l-sky-500',     icon: 'from-sky-400 to-blue-700'     },
    amber:   { bar: 'border-l-amber-500',   icon: 'from-amber-400 to-orange-600' },
    purple:  { bar: 'border-l-violet-500',  icon: 'from-violet-400 to-purple-700'},
    emerald: { bar: 'border-l-emerald-500', icon: 'from-teal-400 to-emerald-700' },
  }
  const a = accents[color] ?? accents.blue
  return (
    <Link to={to}
      className={`card card-hover border-l-4 ${a.bar} p-4 block
        ${selected ? 'ring-2 ring-brand-400 ring-offset-2 ring-offset-neu-base' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-xl flex items-center justify-center shadow-neu-xs bg-gradient-to-br ${a.icon}`}>
            <Icon className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-brand-900">{label}</span>
        </div>
        <span className={`text-lg font-extrabold ${isGood ? 'text-emerald-600' : 'text-rose-600'}`}>{pct}%</span>
      </div>
      <div className="w-full rounded-full h-2 bg-neu-base shadow-neu-in-xs">
        <div
          className={`h-2 rounded-full bg-gradient-to-r ${isGood ? 'from-teal-400 to-emerald-600' : 'from-rose-400 to-rose-600'}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-2">{total} evaluaciones</p>
    </Link>
  )
}

// ─── Icono para actividad reciente ───────────────────────────────────────────
const TIPO_ICON = {
  aislamiento:  { Icon: ShieldAlert, bg: 'bg-red-50',     ic: 'text-red-500'     },
  higiene:      { Icon: Hand,        bg: 'bg-blue-50',    ic: 'text-blue-500'    },
  luminometria: { Icon: Microscope,  bg: 'bg-amber-50',   ic: 'text-amber-500'   },
  ronda:        { Icon: Stethoscope, bg: 'bg-purple-50',  ic: 'text-purple-500'  },
  avp:          { Icon: Syringe,     bg: 'bg-brand-50',  ic: 'text-brand-500'  },
  cv:           { Icon: Droplets,    bg: 'bg-cyan-50',    ic: 'text-cyan-500'    },
  pn:           { Icon: Wind,        bg: 'bg-violet-50',  ic: 'text-violet-500'  },
}

// ─── Dashboard ───────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [stats,     setStats]     = useState(null)
  const [recientes, setRecientes] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [filtro,    setFiltro]    = useState('')   // '' = todas

  useEffect(() => { loadData() }, [])

  async function loadData() {
    // Estadísticas por encuesta
    const [
      { data: aislamiento },
      { data: higiene },
      { data: luminometria },
      { data: ronda },
      { data: avp },
      { data: cv },
      { data: pn },
    ] = await Promise.all([
      supabase.from('encuesta_aislamiento').select('adherencia, estado'),
      supabase.from('encuesta_higiene_manos').select('resultado_cumplimiento, estado'),
      supabase.from('encuesta_luminometria').select('rango, estado'),
      supabase.from('encuesta_ronda_cirugia').select('cumplimiento_profilaxis, estado'),
      supabase.from('encuesta_acceso_venoso').select('id'),
      supabase.from('encuesta_cateter_vesical').select('id'),
      supabase.from('encuesta_prevencion_neumonia').select('id'),
    ])

    const calcField = (arr, field) => ({
      total:  arr?.length ?? 0,
      cumple: arr?.filter(r => r[field] === 'CUMPLE').length ?? 0,
    })
    const a   = calcField(aislamiento, 'adherencia')
    const h   = calcField(higiene,      'resultado_cumplimiento')
    const l   = calcField(luminometria, 'rango')
    const r   = calcField(ronda,        'cumplimiento_profilaxis')
    const av  = { total: avp?.length ?? 0, cumple: 0 }
    const cv2 = { total: cv?.length  ?? 0, cumple: 0 }
    const pn2 = { total: pn?.length  ?? 0, cumple: 0 }

    const totalAll  = a.total + h.total + l.total + r.total + av.total + cv2.total + pn2.total
    const cumpleAll = a.cumple + h.cumple + l.cumple + r.cumple

    const pendientes = [
      ...(aislamiento ?? []), ...(higiene ?? []),
      ...(luminometria ?? []), ...(ronda ?? []),
    ].filter(x => x.estado === 'pendiente').length

    setStats({
      totalAll,
      pctGlobal: porcentaje(cumpleAll, totalAll),
      pendientes,
      aislamiento:  { total: a.total,  pct: porcentaje(a.cumple,  a.total)  },
      higiene:      { total: h.total,  pct: porcentaje(h.cumple,  h.total)  },
      luminometria: { total: l.total,  pct: porcentaje(l.cumple,  l.total)  },
      ronda:        { total: r.total,  pct: porcentaje(r.cumple,  r.total)  },
      dispositivos: { total: av.total + cv2.total + pn2.total, pct: 0 },
    })

    // Actividad reciente — carga desde todas las tablas
    const [
      { data: recAis },
      { data: recHig },
      { data: recLum },
      { data: recCx  },
      { data: recAvp },
      { data: recCv  },
      { data: recPn  },
      { data: perfiles },
    ] = await Promise.all([
      supabase.from('encuesta_aislamiento')
        .select('id, created_at, fecha_registro, servicio, adherencia, tipo_aislamiento, profesional, nombre_evaluado, estado, registrado_por')
        .order('created_at', { ascending: false }).limit(6),
      supabase.from('encuesta_higiene_manos')
        .select('id, created_at, fecha_evaluacion, servicio_evaluado, resultado_cumplimiento, perfil_colaborador, nombre_evaluado, sumatoria_cumplimiento, estado, registrado_por')
        .order('created_at', { ascending: false }).limit(6),
      supabase.from('encuesta_luminometria')
        .select('id, created_at, fecha_registro, servicio_evaluado, rango, objeto, resultado, estado, registrado_por')
        .order('created_at', { ascending: false }).limit(6),
      supabase.from('encuesta_ronda_cirugia')
        .select('id, created_at, fecha_registro, servicio, cumplimiento_profilaxis, quirofano, especialidad, profesional, estado, registrado_por')
        .order('created_at', { ascending: false }).limit(6),
      supabase.from('encuesta_acceso_venoso')
        .select('id, created_at, fecha_registro, ubicacion_cama, nombre_paciente, num_accesos, estado, registrado_por')
        .order('created_at', { ascending: false }).limit(6),
      supabase.from('encuesta_cateter_vesical')
        .select('id, created_at, fecha_registro, ubicacion_cama, nombre_paciente, num_casos, estado, registrado_por')
        .order('created_at', { ascending: false }).limit(6),
      supabase.from('encuesta_prevencion_neumonia')
        .select('id, created_at, fecha_registro, ubicacion_cama, nombre_paciente, num_casos, estado, registrado_por')
        .order('created_at', { ascending: false }).limit(6),
      supabase.from('user_profiles').select('id, nombre, email'),
    ])

    // Mapa id → nombre para resolver "quién diligenció"
    const quien = Object.fromEntries(
      (perfiles ?? []).map(p => [p.id, p.nombre || p.email || 'Usuario'])
    )

    // `detalles` son los datos relevantes de cada encuesta que se muestran como chips
    const merged = [
      ...(recAis ?? []).map(r => ({
        id: r.id, tipo: 'aislamiento', fecha: r.created_at, fechaEncuesta: r.fecha_registro,
        texto: r.servicio, estado: r.adherencia, estadoFlujo: r.estado,
        autor: quien[r.registrado_por],
        detalles: [r.tipo_aislamiento, r.profesional, r.nombre_evaluado],
      })),
      ...(recHig ?? []).map(r => ({
        id: r.id, tipo: 'higiene', fecha: r.created_at, fechaEncuesta: r.fecha_evaluacion,
        texto: r.servicio_evaluado, estado: r.resultado_cumplimiento, estadoFlujo: r.estado,
        autor: quien[r.registrado_por],
        detalles: [r.perfil_colaborador, r.nombre_evaluado,
                   r.sumatoria_cumplimiento != null ? `${r.sumatoria_cumplimiento}/5 momentos` : null],
      })),
      ...(recLum ?? []).map(r => ({
        id: r.id, tipo: 'luminometria', fecha: r.created_at, fechaEncuesta: r.fecha_registro,
        texto: r.servicio_evaluado, estado: r.rango, estadoFlujo: r.estado,
        autor: quien[r.registrado_por],
        detalles: [r.objeto, r.resultado != null ? `${r.resultado} RLU` : null],
      })),
      ...(recCx ?? []).map(r => ({
        id: r.id, tipo: 'ronda', fecha: r.created_at, fechaEncuesta: r.fecha_registro,
        texto: r.servicio, estado: r.cumplimiento_profilaxis, estadoFlujo: r.estado,
        autor: quien[r.registrado_por],
        detalles: [r.quirofano, r.especialidad, r.profesional],
      })),
      ...(recAvp ?? []).map(r => ({
        id: r.id, tipo: 'avp', fecha: r.created_at, fechaEncuesta: r.fecha_registro,
        texto: r.ubicacion_cama || 'AVP', estado: null, estadoFlujo: r.estado,
        autor: quien[r.registrado_por],
        detalles: [r.nombre_paciente, r.num_accesos != null ? `${r.num_accesos} acceso(s)` : null],
      })),
      ...(recCv ?? []).map(r => ({
        id: r.id, tipo: 'cv', fecha: r.created_at, fechaEncuesta: r.fecha_registro,
        texto: r.ubicacion_cama || 'CV', estado: null, estadoFlujo: r.estado,
        autor: quien[r.registrado_por],
        detalles: [r.nombre_paciente, r.num_casos != null ? `${r.num_casos} caso(s)` : null],
      })),
      ...(recPn ?? []).map(r => ({
        id: r.id, tipo: 'pn', fecha: r.created_at, fechaEncuesta: r.fecha_registro,
        texto: r.ubicacion_cama || 'NAV', estado: null, estadoFlujo: r.estado,
        autor: quien[r.registrado_por],
        detalles: [r.nombre_paciente, r.num_casos != null ? `${r.num_casos} caso(s)` : null],
      })),
    ]
      .map(r => ({ ...r, detalles: r.detalles.filter(Boolean) }))
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 14)

    setRecientes(merged)
    setLoading(false)
  }

  // Actividad filtrada según encuesta seleccionada
  const recientesFiltrados = useMemo(() => {
    if (!filtro) return recientes
    if (filtro === 'dispositivos') return recientes.filter(r => ['avp','cv','pn'].includes(r.tipo))
    return recientes.filter(r => r.tipo === filtro)
  }, [recientes, filtro])

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // KPIs dependiendo del filtro activo
  const kpiTotal = filtro && filtro !== 'dispositivos'
    ? stats[filtro]?.total ?? 0
    : filtro === 'dispositivos'
      ? stats.dispositivos.total
      : stats.totalAll

  const kpiPct = filtro && filtro !== 'dispositivos'
    ? stats[filtro]?.pct ?? 0
    : filtro === 'dispositivos'
      ? 0
      : stats.pctGlobal

  return (
    <div className="p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Resumen general del comité de infecciones</p>
        </div>
      </div>

      {/* Filtro por encuesta */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 font-medium mr-1">Filtrar por encuesta:</span>
        {FILTROS.map(f => (
          <button key={f.value}
            onClick={() => setFiltro(f.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              filtro === f.value
                ? f.activeCls
                : `neu-pill text-slate-600 ${f.hoverCls}`
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={filtro ? `Total — ${ENCUESTAS_CFG[filtro]?.label ?? 'Encuesta'}` : 'Total Evaluaciones'}
          value={kpiTotal}
          sub={KPI_SUBTITLES[filtro]?.total}
          color="indigo"
          icon={filtro ? ENCUESTAS_CFG[filtro]?.icon : CheckCircle2}
        />
        <KpiCard
          label="Adherencia Global"
          value={`${kpiPct}%`}
          sub={KPI_SUBTITLES[filtro]?.pct}
          color={kpiPct >= 80 ? 'emerald' : 'red'}
          icon={kpiPct >= 80 ? TrendingUp : TrendingDown}
        />
        <KpiCard label="Pendientes"        value={stats.pendientes} color="amber"  icon={Clock}       sub="Encuestas sin cerrar" />
        <KpiCard label="Tipos de Encuesta" value={5}                color="slate"  icon={AlertCircle} sub="módulos activos" />
      </div>

      {/* Adherencia por encuesta */}
      <div>
        <h2 className="section-title mb-3">Adherencia por Encuesta</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          <EncuestaCard
            to="/encuestas/aislamiento"
            icon={ShieldAlert}
            label="Aislamiento"
            selected={filtro === 'aislamiento'}
            {...stats.aislamiento}
            color="red"
          />
          <EncuestaCard
            to="/encuestas/higiene-manos"
            icon={Hand}
            label="Higiene de Manos"
            selected={filtro === 'higiene'}
            {...stats.higiene}
            color="blue"
          />
          <EncuestaCard
            to="/encuestas/luminometria"
            icon={Microscope}
            label="Luminometría"
            selected={filtro === 'luminometria'}
            {...stats.luminometria}
            color="amber"
          />
          <EncuestaCard
            to="/encuestas/ronda-cirugia"
            icon={Stethoscope}
            label="Ronda Cirugía"
            selected={filtro === 'ronda'}
            {...stats.ronda}
            color="purple"
          />
          <EncuestaCard
            to="/encuestas/seguimiento-dispositivos"
            icon={Activity}
            label="Dispositivos"
            selected={filtro === 'dispositivos'}
            {...stats.dispositivos}
            color="emerald"
          />
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-title">Actividad Reciente</h2>
          {filtro && (
            <span className="text-xs text-brand-600 font-semibold">
              Filtrado: {ENCUESTAS_CFG[filtro]?.label}
            </span>
          )}
        </div>

        {recientesFiltrados.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Sin registros recientes</p>
        ) : (
          <div className="space-y-2">
            {recientesFiltrados.map((r, i) => {
              const cfg  = TIPO_ICON[r.tipo]
              const Icon = cfg?.Icon ?? CheckCircle2
              const isCumple = r.estado === 'CUMPLE'
              const noEstado = !r.estado
              return (
                <div key={`${r.tipo}-${r.id}-${i}`}
                  className="flex items-start justify-between gap-3 py-2.5 border-b border-white/70 last:border-0">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-8 h-8 shrink-0 rounded-xl shadow-neu-xs flex items-center justify-center ${cfg?.bg ?? 'bg-slate-50'}`}>
                      <Icon className={`w-3.5 h-3.5 ${cfg?.ic ?? 'text-slate-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brand-900">
                        {ENCUESTAS_CFG[r.tipo]?.label} — {r.texto ?? 'Sin servicio'}
                      </p>

                      {/* Datos relevantes de la encuesta */}
                      {r.detalles?.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {r.detalles.map((d, j) => (
                            <span key={j}
                              className="text-[10px] font-medium text-slate-600 bg-white/70 shadow-neu-xs rounded-full px-2 py-0.5">
                              {d}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3 h-3 text-brand-500" />
                          {r.autor ?? 'Sin registrar'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="w-3 h-3 text-slate-400" />
                          {formatDate(r.fechaEncuesta ?? r.fecha)}
                        </span>
                        <span className="text-slate-400">Registrado {formatDateTime(r.fecha)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {noEstado ? null : (
                      <span className={`badge ${isCumple ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {isCumple ? 'Cumple' : 'No Cumple'}
                      </span>
                    )}
                    {r.estadoFlujo && (
                      <span className={`badge ${estadoBadgeColor(r.estadoFlujo)}`}>
                        {estadoLabel(r.estadoFlujo)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
