import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, Activity, Syringe, Droplets, Wind } from 'lucide-react'

const PIE_COLORS  = ['#6366f1', '#06b6d4', '#8b5cf6']
const BOOL_COLORS = { true: '#10b981', false: '#f87171' }

function KpiCard({ label, value, sub, color = 'slate', icon: Icon }) {
  const cls = {
    indigo:  'bg-indigo-50  text-indigo-700',
    cyan:    'bg-cyan-50    text-cyan-700',
    violet:  'bg-violet-50  text-violet-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    red:     'bg-red-50     text-red-700',
    slate:   'bg-slate-50   text-slate-700',
  }[color]
  return (
    <div className={`card p-4 flex items-center gap-3 ${cls}`}>
      {Icon && <Icon className="w-6 h-6 opacity-60 shrink-0" />}
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs font-medium">{label}</p>
        {sub && <p className="text-[11px] opacity-70">{sub}</p>}
      </div>
    </div>
  )
}

// Calcula % de criterios booleanos que son true
function calcAdherencia(rows, criterioKeys) {
  if (!rows.length) return 0
  const total  = rows.length * criterioKeys.length
  const cumple = rows.reduce((acc, r) => {
    return acc + criterioKeys.filter(k => r[k] === true).length
  }, 0)
  return total > 0 ? Math.round((cumple / total) * 100) : 0
}

const AVP_KEYS = ['criterio_1_rotulo','criterio_2_fijacion','criterio_3_mantenimiento','criterio_4_pertinencia','criterio_5_educacion']
const CV_KEYS  = ['criterio_1_fijacion','criterio_2_posicion_bolsa','criterio_3_rotulacion','criterio_4_indicacion','criterio_5_flujo_continuo','criterio_6_lista_chequeo_sonda']
const PN_KEYS  = ['criterio_1_cabecera','criterio_2_higiene_oral','criterio_3_implementos','criterio_4_lista_chequeo_nav']

const AVP_LABELS = ['Rótulo','Fijación','Mantenimiento','Pertinencia','Educación']
const CV_LABELS  = ['Fijación','Posic. Bolsa','Rotulación','Indicación','Flujo','Lista Chequeo']
const PN_LABELS  = ['Cabecera 30°','Hig. Oral','Implementos','Lista NAV']

export default function DispositivosDashboard() {
  const [avp, setAvp]         = useState([])
  const [cv,  setCv]          = useState([])
  const [pn,  setPn]          = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('encuesta_acceso_venoso').select('*'),
      supabase.from('encuesta_cateter_vesical').select('*'),
      supabase.from('encuesta_prevencion_neumonia').select('*'),
    ]).then(([{ data: a }, { data: c }, { data: p }]) => {
      setAvp(a ?? [])
      setCv(c  ?? [])
      setPn(p  ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="p-8 flex justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const pctAvp = calcAdherencia(avp, AVP_KEYS)
  const pctCv  = calcAdherencia(cv,  CV_KEYS)
  const pctPn  = calcAdherencia(pn,  PN_KEYS)

  // Comparación general entre dispositivos
  const comparacion = [
    { name: 'Acceso Venoso Periférico', total: avp.length, pct: pctAvp },
    { name: 'Catéter Vesical',          total: cv.length,  pct: pctCv  },
    { name: 'Prevención NAV',           total: pn.length,  pct: pctPn  },
  ]

  // Pie de totales
  const pieTotal = comparacion.filter(d => d.total > 0)

  // Criterios AVP
  const criteriosAvp = AVP_KEYS.map((k, i) => {
    const count = avp.filter(r => r[k] === true).length
    return { name: AVP_LABELS[i], cumple: count, noCumple: avp.length - count }
  })

  // Criterios CV
  const criteriosCv = CV_KEYS.map((k, i) => {
    const count = cv.filter(r => r[k] === true).length
    return { name: CV_LABELS[i], cumple: count, noCumple: cv.length - count }
  })

  // Criterios NAV
  const criteriosPn = PN_KEYS.map((k, i) => {
    const count = pn.filter(r => r[k] === true).length
    return { name: PN_LABELS[i], cumple: count, noCumple: pn.length - count }
  })

  const noData = avp.length + cv.length + pn.length === 0

  return (
    <div className="p-6 lg:p-8 animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/encuestas/seguimiento-dispositivos"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
          <Activity className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="page-title">Dashboard — Seguimiento de Dispositivos</h1>
          <p className="page-subtitle">AVP · Catéter Vesical · Prevención NAV</p>
        </div>
      </div>

      {/* KPIs por dispositivo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Acceso Venoso Periférico" value={`${pctAvp}%`} sub={`${avp.length} registros`} color="indigo"  icon={Syringe} />
        <KpiCard label="Catéter Vesical"          value={`${pctCv}%`}  sub={`${cv.length} registros`}  color="cyan"    icon={Droplets} />
        <KpiCard label="Prevención NAV"           value={`${pctPn}%`}  sub={`${pn.length} registros`}  color="violet"  icon={Wind} />
      </div>

      {noData ? (
        <div className="card p-8 text-center text-slate-400">No hay registros disponibles</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Comparación de adherencia */}
          <div className="card p-5">
            <h3 className="section-title mb-4">Adherencia por Dispositivo (%)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={comparacion} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis domain={[0,100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={v => `${v}%`} />
                <Bar dataKey="pct" name="% Adherencia"
                  fill="#6366f1" radius={[3,3,0,0]}
                  label={{ position: 'top', fontSize: 11, formatter: v => `${v}%` }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie de totales */}
          <div className="card p-5">
            <h3 className="section-title mb-4">Distribución de Registros</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieTotal} cx="50%" cy="50%" outerRadius={85}
                  dataKey="total"
                  label={({ name, percent }) => `${Math.round(percent * 100)}%`}
                  labelLine>
                  {pieTotal.map((e, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Criterios AVP */}
          {avp.length > 0 && (
            <div className="card p-5">
              <h3 className="section-title mb-1">Criterios — Acceso Venoso Periférico</h3>
              <p className="text-xs text-slate-400 mb-3">{avp.length} registros</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={criteriosAvp} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="cumple"    name="Cumple"    fill="#10b981" stackId="a" />
                  <Bar dataKey="noCumple"  name="No Cumple" fill="#f87171" stackId="a" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Criterios CV */}
          {cv.length > 0 && (
            <div className="card p-5">
              <h3 className="section-title mb-1">Criterios — Catéter Vesical</h3>
              <p className="text-xs text-slate-400 mb-3">{cv.length} registros</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={criteriosCv} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="cumple"   name="Cumple"    fill="#06b6d4" stackId="a" />
                  <Bar dataKey="noCumple" name="No Cumple" fill="#f87171" stackId="a" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Criterios NAV */}
          {pn.length > 0 && (
            <div className="card p-5 lg:col-span-2">
              <h3 className="section-title mb-1">Criterios — Prevención Neumonía (NAV)</h3>
              <p className="text-xs text-slate-400 mb-3">{pn.length} registros</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={criteriosPn} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="cumple"   name="Cumple"    fill="#8b5cf6" stackId="a" />
                  <Bar dataKey="noCumple" name="No Cumple" fill="#f87171" stackId="a" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
