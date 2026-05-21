import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate, porcentaje } from '../lib/utils'
import {
  ShieldAlert, Hand, Microscope, Stethoscope, Activity,
  TrendingUp, TrendingDown, Clock, CheckCircle2, AlertCircle,
} from 'lucide-react'

// ─── Configuración de encuestas ─────────────────────────────────────────────
const ENCUESTAS_CFG = {
  aislamiento:  { label: 'Aislamiento',      color: 'red',     icon: ShieldAlert,  border: 'border-l-red-400'    },
  higiene:      { label: 'Higiene de Manos', color: 'blue',    icon: Hand,         border: 'border-l-blue-400'   },
  luminometria: { label: 'Luminometría',     color: 'amber',   icon: Microscope,   border: 'border-l-amber-400'  },
  ronda:        { label: 'Ronda Cirugía',    color: 'purple',  icon: Stethoscope,  border: 'border-l-purple-400' },
  dispositivos: { label: 'Dispositivos',     color: 'emerald', icon: Activity,     border: 'border-l-emerald-400'},
}

const FILTROS = [
  { value: '',             label: 'Todas',            activeCls: 'bg-indigo-600 text-white',  hoverCls: 'hover:bg-indigo-50 hover:text-indigo-700'  },
  { value: 'aislamiento',  label: 'Aislamiento',      activeCls: 'bg-red-600 text-white',     hoverCls: 'hover:bg-red-50 hover:text-red-700'        },
  { value: 'higiene',      label: 'Higiene de Manos', activeCls: 'bg-blue-600 text-white',    hoverCls: 'hover:bg-blue-50 hover:text-blue-700'      },
  { value: 'luminometria', label: 'Luminometría',     activeCls: 'bg-amber-500 text-white',   hoverCls: 'hover:bg-amber-50 hover:text-amber-700'    },
  { value: 'ronda',        label: 'Ronda Cirugía',    activeCls: 'bg-purple-600 text-white',  hoverCls: 'hover:bg-purple-50 hover:text-purple-700'  },
  { value: 'dispositivos', label: 'Dispositivos',     activeCls: 'bg-emerald-600 text-white', hoverCls: 'hover:bg-emerald-50 hover:text-emerald-700'},
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
    indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  icon: 'bg-indigo-100'  },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'bg-emerald-100' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   icon: 'bg-amber-100'   },
    red:     { bg: 'bg-red-50',     text: 'text-red-700',     icon: 'bg-red-100'     },
    slate:   { bg: 'bg-slate-50',   text: 'text-slate-700',   icon: 'bg-slate-100'   },
  }
  const c = colors[color] ?? colors.indigo
  return (
    <div className={`card p-4 flex items-center gap-4 ${c.bg}`}>
      {Icon && (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.icon}`}>
          <Icon className={`w-5 h-5 ${c.text}`} />
        </div>
      )}
      <div>
        <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
        <p className="text-xs text-slate-600 font-medium">{label}</p>
        {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}

function EncuestaCard({ to, icon: Icon, label, total, pct, color, selected }) {
  const isGood = pct >= 80
  const borders = {
    red:     'border-l-red-400',
    blue:    'border-l-blue-400',
    amber:   'border-l-amber-400',
    purple:  'border-l-purple-400',
    emerald: 'border-l-emerald-400',
  }
  return (
    <Link to={to}
      className={`card border-l-4 ${borders[color]} p-4 hover:shadow-md transition-all block
        ${selected ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">{label}</span>
        </div>
        <span className={`text-lg font-bold ${isGood ? 'text-emerald-600' : 'text-red-600'}`}>{pct}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${isGood ? 'bg-emerald-500' : 'bg-red-500'}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
      <p className="text-xs text-slate-400 mt-2">{total} evaluaciones</p>
    </Link>
  )
}

// ─── Icono para actividad reciente ───────────────────────────────────────────
const TIPO_ICON = {
  aislamiento:  { Icon: ShieldAlert, bg: 'bg-red-50',     ic: 'text-red-500'     },
  higiene:      { Icon: Hand,        bg: 'bg-blue-50',    ic: 'text-blue-500'    },
  luminometria: { Icon: Microscope,  bg: 'bg-amber-50',   ic: 'text-amber-500'   },
  ronda:        { Icon: Stethoscope, bg: 'bg-purple-50',  ic: 'text-purple-500'  },
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

    // Actividad reciente — carga desde las 4 tablas con campo de cumplimiento
    const [
      { data: recAis },
      { data: recHig },
      { data: recLum },
      { data: recCx  },
    ] = await Promise.all([
      supabase.from('encuesta_aislamiento').select('id, created_at, servicio, adherencia')
        .order('created_at', { ascending: false }).limit(5),
      supabase.from('encuesta_higiene_manos').select('id, created_at, servicio_evaluado, resultado_cumplimiento')
        .order('created_at', { ascending: false }).limit(5),
      supabase.from('encuesta_luminometria').select('id, created_at, servicio_evaluado, rango')
        .order('created_at', { ascending: false }).limit(5),
      supabase.from('encuesta_ronda_cirugia').select('id, created_at, servicio, cumplimiento_profilaxis')
        .order('created_at', { ascending: false }).limit(5),
    ])

    const merged = [
      ...(recAis ?? []).map(r => ({ id: r.id, tipo: 'aislamiento',  texto: r.servicio,              estado: r.adherencia,               fecha: r.created_at })),
      ...(recHig ?? []).map(r => ({ id: r.id, tipo: 'higiene',      texto: r.servicio_evaluado,     estado: r.resultado_cumplimiento,   fecha: r.created_at })),
      ...(recLum ?? []).map(r => ({ id: r.id, tipo: 'luminometria', texto: r.servicio_evaluado,     estado: r.rango,                    fecha: r.created_at })),
      ...(recCx  ?? []).map(r => ({ id: r.id, tipo: 'ronda',        texto: r.servicio,              estado: r.cumplimiento_profilaxis,  fecha: r.created_at })),
    ]
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, 12)

    setRecientes(merged)
    setLoading(false)
  }

  // Actividad filtrada según encuesta seleccionada
  const recientesFiltrados = useMemo(() => {
    if (!filtro) return recientes
    return recientes.filter(r => r.tipo === filtro)
  }, [recientes, filtro])

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
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
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors shadow-sm ${
              filtro === f.value
                ? f.activeCls
                : `bg-slate-100 text-slate-600 ${f.hoverCls}`
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
            <span className="text-xs text-indigo-600 font-medium">
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
                  className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${cfg?.bg ?? 'bg-slate-50'}`}>
                      <Icon className={`w-3.5 h-3.5 ${cfg?.ic ?? 'text-slate-400'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">
                        {ENCUESTAS_CFG[r.tipo]?.label} — {r.texto ?? 'Sin servicio'}
                      </p>
                      <p className="text-xs text-slate-400">{formatDate(r.fecha)}</p>
                    </div>
                  </div>
                  {noEstado ? null : (
                    <span className={`badge ${isCumple ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {isCumple ? 'Cumple' : 'No Cumple'}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
