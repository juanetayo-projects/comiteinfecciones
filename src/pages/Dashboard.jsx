import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDate, porcentaje } from '../lib/utils'
import {
  ShieldAlert, Hand, Microscope, Stethoscope, Activity,
  TrendingUp, TrendingDown, Minus, Clock, CheckCircle2, AlertCircle,
} from 'lucide-react'

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

function EncuestaCard({ to, icon: Icon, label, total, pct, color }) {
  const isGood = pct >= 80
  const colors = {
    red:     'border-l-red-400',
    blue:    'border-l-blue-400',
    amber:   'border-l-amber-400',
    purple:  'border-l-purple-400',
    emerald: 'border-l-emerald-400',
  }

  return (
    <Link to={to} className={`card border-l-4 ${colors[color]} p-4 hover:shadow-md transition-shadow block`}>
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
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-slate-400 mt-2">{total} evaluaciones</p>
    </Link>
  )
}

export default function Dashboard() {
  const [stats, setStats]       = useState(null)
  const [recientes, setRecientes] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
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
      supabase.from('encuesta_higiene_manos').select('adherencia, estado'),
      supabase.from('encuesta_luminometria').select('adherencia, estado'),
      supabase.from('encuesta_ronda_cirugia').select('adherencia, estado'),
      supabase.from('encuesta_acceso_venoso').select('adherencia'),
      supabase.from('encuesta_cateter_vesical').select('adherencia'),
      supabase.from('encuesta_prevencion_neumonia').select('adherencia'),
    ])

    const calc = (arr) => ({
      total:  arr?.length ?? 0,
      cumple: arr?.filter(r => r.adherencia === 'cumple').length ?? 0,
    })

    const a  = calc(aislamiento)
    const h  = calc(higiene)
    const l  = calc(luminometria)
    const r  = calc(ronda)
    const av = calc(avp)
    const cv2 = calc(cv)
    const pn2 = calc(pn)

    const totalAll = a.total + h.total + l.total + r.total + av.total + cv2.total + pn2.total
    const cumpleAll = a.cumple + h.cumple + l.cumple + r.cumple + av.cumple + cv2.cumple + pn2.cumple

    const pendientes = [
      ...(aislamiento ?? []), ...(higiene ?? []),
      ...(luminometria ?? []), ...(ronda ?? []),
    ].filter(r => r.estado === 'pendiente').length

    setStats({
      totalAll, pctGlobal: porcentaje(cumpleAll, totalAll),
      pendientes,
      aislamiento: { total: a.total, pct: porcentaje(a.cumple, a.total) },
      higiene:     { total: h.total, pct: porcentaje(h.cumple, h.total) },
      luminometria:{ total: l.total, pct: porcentaje(l.cumple, l.total) },
      ronda:       { total: r.total, pct: porcentaje(r.cumple, r.total) },
      dispositivos:{ total: av.total + cv2.total + pn2.total, pct: porcentaje(av.cumple + cv2.cumple + pn2.cumple, av.total + cv2.total + pn2.total) },
    })

    // Últimos registros (union simulado)
    const { data: rec } = await supabase
      .from('encuesta_aislamiento')
      .select('id, created_at, servicio, adherencia')
      .order('created_at', { ascending: false })
      .limit(5)

    setRecientes(rec ?? [])
    setLoading(false)
  }

  if (loading) return (
    <div className="p-6 flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Resumen general del comité de infecciones</p>
      </div>

      {/* KPIs principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Evaluaciones" value={stats.totalAll}        color="indigo"  icon={CheckCircle2} />
        <KpiCard label="Adherencia Global"  value={`${stats.pctGlobal}%`} color={stats.pctGlobal >= 80 ? 'emerald' : 'red'} icon={stats.pctGlobal >= 80 ? TrendingUp : TrendingDown} />
        <KpiCard label="Pendientes"         value={stats.pendientes}      color="amber"   icon={Clock} />
        <KpiCard label="Encuestas Activas"  value="5"                     color="slate"   icon={AlertCircle} sub="tipos de encuesta" />
      </div>

      {/* Adherencia por encuesta */}
      <div>
        <h2 className="section-title mb-3">Adherencia por Encuesta</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          <EncuestaCard to="/encuestas/aislamiento"            icon={ShieldAlert}  label="Aislamiento"       {...stats.aislamiento}  color="red" />
          <EncuestaCard to="/encuestas/higiene-manos"          icon={Hand}         label="Higiene de Manos"  {...stats.higiene}      color="blue" />
          <EncuestaCard to="/encuestas/luminometria"           icon={Microscope}   label="Luminometría"      {...stats.luminometria} color="amber" />
          <EncuestaCard to="/encuestas/ronda-cirugia"          icon={Stethoscope}  label="Ronda Cirugía"     {...stats.ronda}        color="purple" />
          <EncuestaCard to="/encuestas/seguimiento-dispositivos" icon={Activity}   label="Dispositivos"      {...stats.dispositivos} color="emerald" />
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="card p-4">
        <h2 className="section-title mb-3">Actividad Reciente</h2>
        {recientes.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Sin registros recientes</p>
        ) : (
          <div className="space-y-2">
            {recientes.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">Aislamiento — {r.servicio ?? 'Sin servicio'}</p>
                    <p className="text-xs text-slate-400">{formatDate(r.created_at)}</p>
                  </div>
                </div>
                <span className={`badge ${r.adherencia === 'cumple' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                  {r.adherencia === 'cumple' ? 'Cumple' : 'No Cumple'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
