import { useEffect, useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, Activity, Syringe, Droplets, Wind, Filter, X } from 'lucide-react'
import DashboardPdfButton from '../../components/common/DashboardPdfButton'
import { filtrosResumen } from '../../lib/utils'
import {
  buildBarData, withPct, withCriterioPct, SegmentLabel, TotalPctLabel, TopLabel, BarTooltip,
  BAR_CUMPLE, BAR_NO_CUMPLE, PCT_HINT,
} from '../../lib/chartLabels'

const PIE_COLORS  = ['#6366f1', '#06b6d4', '#8b5cf6']

function KpiCard({ label, value, sub, color = 'slate', icon: Icon }) {
  const cls = {
    indigo:  'kpi-tile kpi-indigo',
    cyan:    'kpi-tile kpi-cyan',
    violet:  'kpi-tile kpi-violet',
    emerald: 'kpi-tile kpi-emerald',
    red:     'kpi-tile kpi-red',
    slate:   'kpi-tile kpi-slate',
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

function SH({ children }) {
  return (
    <div className="px-3.5 py-2.5 bg-brand-gradient border-l-4 border-accent-400 rounded-r-xl shadow-neu-sm mb-4">
      <h3 className="text-sm font-semibold text-white tracking-wide">{children}</h3>
    </div>
  )
}

function calcAdherencia(rows, criterioKeys) {
  if (!rows.length) return 0
  const total  = rows.length * criterioKeys.length
  const cumple = rows.reduce((acc, r) => acc + criterioKeys.filter(k => r[k] === true).length, 0)
  return total > 0 ? Math.round((cumple / total) * 100) : 0
}

// Resumen por ubicacion_cama para un tipo de dispositivo
function buildSummaryDisp(rows, criterioKeys) {
  const map = {}
  rows.forEach(r => {
    const ub = r.ubicacion_cama || 'Sin ubicación'
    if (!map[ub]) map[ub] = { nombre: ub, registros: 0, cumpleCrit: 0, totalCrit: 0 }
    map[ub].registros++
    criterioKeys.forEach(k => {
      map[ub].totalCrit++
      if (r[k] === true) map[ub].cumpleCrit++
    })
  })
  return Object.values(map).map(r => ({
    ...r,
    pct: r.totalCrit > 0 ? Math.round((r.cumpleCrit / r.totalCrit) * 100) : 0,
  })).sort((a, b) => b.registros - a.registros)
}

function SummaryTableDisp({ rows, title, accentColor }) {
  if (!rows.length) return null
  const badge = {
    indigo: 'bg-brand-100 text-brand-700',
    cyan:   'bg-cyan-100 text-cyan-700',
    violet: 'bg-violet-100 text-violet-700',
  }[accentColor] ?? 'bg-slate-100 text-slate-700'
  return (
    <div className="card p-5">
      <SH>{title}</SH>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left pb-2 pr-4 font-medium text-slate-600">Ubicación / Cama</th>
              <th className="text-center pb-2 px-2 font-medium text-slate-600">Registros</th>
              <th className="text-center pb-2 px-2 font-medium text-emerald-600">Criterios Cumplidos</th>
              <th className="text-center pb-2 font-medium text-slate-600">% Adherencia</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-white/70 hover:bg-slate-50 transition-colors">
                <td className="py-2 pr-4 text-slate-700 font-medium">{r.nombre}</td>
                <td className="py-2 px-2 text-center text-slate-500">{r.registros}</td>
                <td className="py-2 px-2 text-center font-semibold text-emerald-600">{r.cumpleCrit} / {r.totalCrit}</td>
                <td className="py-2 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold
                    ${r.pct >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {r.pct}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const AVP_KEYS = ['criterio_1_rotulo','criterio_2_fijacion','criterio_3_mantenimiento','criterio_4_pertinencia','criterio_5_educacion']
const CV_KEYS  = ['criterio_1_fijacion','criterio_2_posicion_bolsa','criterio_3_rotulacion','criterio_4_indicacion','criterio_5_flujo_continuo','criterio_6_lista_chequeo_sonda']
const PN_KEYS  = ['criterio_1_cabecera','criterio_2_higiene_oral','criterio_3_implementos','criterio_4_lista_chequeo_nav']

const AVP_LABELS = ['Rótulo','Fijación','Mantenimiento','Pertinencia','Educación']
const CV_LABELS  = ['Fijación','Posic. Bolsa','Rotulación','Indicación','Flujo','Lista Chequeo']
const PN_LABELS  = ['Cabecera 30°','Hig. Oral','Implementos','Lista NAV']

const INIT_FILTERS = { desde: '', hasta: '', ubicacion: '' }
// Etiquetas legibles de los filtros — se imprimen en el encabezado del PDF
const FILTER_LABELS = { desde:'Desde', hasta:'Hasta', ubicacion:'Ubicación/Cama' }

export default function DispositivosDashboard() {
  const [avpRaw, setAvpRaw] = useState([])
  const [cvRaw,  setCvRaw]  = useState([])
  const [pnRaw,  setPnRaw]  = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(INIT_FILTERS)
  const pdfRef = useRef(null)

  useEffect(() => {
    Promise.all([
      supabase.from('encuesta_acceso_venoso').select('*'),
      supabase.from('encuesta_cateter_vesical').select('*'),
      supabase.from('encuesta_prevencion_neumonia').select('*'),
    ]).then(([{ data: a }, { data: c }, { data: p }]) => {
      setAvpRaw(a ?? [])
      setCvRaw(c  ?? [])
      setPnRaw(p  ?? [])
      setLoading(false)
    })
  }, [])

  const ubicaciones = useMemo(() => {
    const all = [
      ...avpRaw.map(r => r.ubicacion_cama),
      ...cvRaw.map(r => r.ubicacion_cama),
      ...pnRaw.map(r => r.ubicacion_cama),
    ].filter(Boolean)
    return [...new Set(all)].sort()
  }, [avpRaw, cvRaw, pnRaw])

  function applyFilter(rows) {
    return rows.filter(r => {
      if (filters.desde    && r.fecha_registro < filters.desde)         return false
      if (filters.hasta    && r.fecha_registro > filters.hasta)         return false
      if (filters.ubicacion && r.ubicacion_cama !== filters.ubicacion)  return false
      return true
    })
  }

  const avp = useMemo(() => applyFilter(avpRaw), [avpRaw, filters])
  const cv  = useMemo(() => applyFilter(cvRaw),  [cvRaw,  filters])
  const pn  = useMemo(() => applyFilter(pnRaw),  [pnRaw,  filters])

  const hasFilters = Object.values(filters).some(Boolean)
  function clearFilters() { setFilters(INIT_FILTERS) }
  function setF(key, val) { setFilters(prev => ({ ...prev, [key]: val })) }

  if (loading) return (
    <div className="p-8 flex justify-center">
      <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const pctAvp = calcAdherencia(avp, AVP_KEYS)
  const pctCv  = calcAdherencia(cv,  CV_KEYS)
  const pctPn  = calcAdherencia(pn,  PN_KEYS)

  const comparacion = [
    { name: 'Acceso Venoso Periférico', total: avp.length, pct: pctAvp },
    { name: 'Catéter Vesical',          total: cv.length,  pct: pctCv  },
    { name: 'Prevención NAV',           total: pn.length,  pct: pctPn  },
  ]

  const pieTotal = comparacion.filter(d => d.total > 0)

  const criteriosAvp = withCriterioPct(AVP_KEYS.map((k, i) => {
    const count = avp.filter(r => r[k] === true).length
    return { name: AVP_LABELS[i], cumple: count, noCumple: avp.length - count }
  }))
  const criteriosCv = withCriterioPct(CV_KEYS.map((k, i) => {
    const count = cv.filter(r => r[k] === true).length
    return { name: CV_LABELS[i], cumple: count, noCumple: cv.length - count }
  }))
  const criteriosPn = withCriterioPct(PN_KEYS.map((k, i) => {
    const count = pn.filter(r => r[k] === true).length
    return { name: PN_LABELS[i], cumple: count, noCumple: pn.length - count }
  }))

  const summaryAvp = buildSummaryDisp(avp, AVP_KEYS)
  const summaryCv  = buildSummaryDisp(cv,  CV_KEYS)
  const summaryPn  = buildSummaryDisp(pn,  PN_KEYS)

  const noData = avp.length + cv.length + pn.length === 0
  const totalRaw = avpRaw.length + cvRaw.length + pnRaw.length

  return (
    <div ref={pdfRef} className="p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/encuestas/seguimiento-dispositivos"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-9 h-9 rounded-xl bg-brand-100 flex items-center justify-center">
          <Activity className="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <h1 className="page-title">Dashboard — Seguimiento de Dispositivos</h1>
          <p className="page-subtitle">AVP · Catéter Vesical · Prevención NAV</p>
        </div>
        <div className="ml-auto" data-pdf-hide>
          <DashboardPdfButton
            targetRef={pdfRef}
            filename="dashboard_dispositivos"
            title="Dashboard — Seguimiento de Dispositivos"
            subtitle="AVP · Catéter Vesical · Prevención NAV"
            filtros={filtrosResumen(filters, FILTER_LABELS)}
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="card p-4" data-pdf-hide>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Filtros</span>
          {hasFilters && (
            <button onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 transition-colors">
              <X className="w-3 h-3" /> Limpiar filtros
            </button>
          )}
        </div>
        <div className="filters-row" style={{ '--cols': 3 }}>
          <div>
            <label>Desde</label>
            <input type="date" className="input"
              value={filters.desde} onChange={e => setF('desde', e.target.value)} />
          </div>
          <div>
            <label>Hasta</label>
            <input type="date" className="input"
              value={filters.hasta} onChange={e => setF('hasta', e.target.value)} />
          </div>
          <div>
            <label>Ubicación / Cama</label>
            <select className="input" value={filters.ubicacion} onChange={e => setF('ubicacion', e.target.value)}>
              <option value="">Todas</option>
              {ubicaciones.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        {hasFilters && (
          <p className="text-xs text-brand-600 mt-2">
            {avp.length + cv.length + pn.length} de {totalRaw} registros mostrados
          </p>
        )}
      </div>

      {/* KPIs por dispositivo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Acceso Venoso Periférico" value={`${pctAvp}%`} sub={`${avp.length} registros`} color="indigo"  icon={Syringe} />
        <KpiCard label="Catéter Vesical"          value={`${pctCv}%`}  sub={`${cv.length} registros`}  color="cyan"    icon={Droplets} />
        <KpiCard label="Prevención NAV"           value={`${pctPn}%`}  sub={`${pn.length} registros`}  color="violet"  icon={Wind} />
      </div>

      {noData ? (
        <div className="card p-8 text-center text-slate-400">No hay registros para los filtros seleccionados</div>
      ) : (
        <>
          {/* Gráficas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="section-title mb-4">Adherencia por Dispositivo (%)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={comparacion} margin={{ top: 22, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f2" />
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

            {avp.length > 0 && (
              <div className="card p-5">
                <h3 className="section-title mb-1">Criterios — Acceso Venoso Periférico</h3>
                <p className="text-[10px] text-slate-500 mb-2">{PCT_HINT}</p>
                <p className="text-xs text-slate-400 mb-3">{avp.length} registros</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={criteriosAvp} margin={{ top: 22, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f2" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="cumple" name="Cumple" fill="#10b981" stackId="a" isAnimationActive={false}>
                      <LabelList dataKey="pctCumple" content={SegmentLabel} />
                    </Bar>
                    <Bar dataKey="noCumple" name="No Cumple" fill="#e11d48" stackId="a" radius={[4,4,0,0]} isAnimationActive={false}>
                      <LabelList dataKey="pctNoCumple" content={SegmentLabel} />
                      <LabelList dataKey="pctCumple"   content={TotalPctLabel} position="top" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {cv.length > 0 && (
              <div className="card p-5">
                <h3 className="section-title mb-1">Criterios — Catéter Vesical</h3>
                <p className="text-[10px] text-slate-500 mb-2">{PCT_HINT}</p>
                <p className="text-xs text-slate-400 mb-3">{cv.length} registros</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={criteriosCv} margin={{ top: 22, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f2" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="cumple" name="Cumple" fill="#06b6d4" stackId="a" isAnimationActive={false}>
                      <LabelList dataKey="pctCumple" content={SegmentLabel} />
                    </Bar>
                    <Bar dataKey="noCumple" name="No Cumple" fill="#e11d48" stackId="a" radius={[4,4,0,0]} isAnimationActive={false}>
                      <LabelList dataKey="pctNoCumple" content={SegmentLabel} />
                      <LabelList dataKey="pctCumple"   content={TotalPctLabel} position="top" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {pn.length > 0 && (
              <div className="card p-5 lg:col-span-2">
                <h3 className="section-title mb-1">Criterios — Prevención Neumonía (NAV)</h3>
                <p className="text-[10px] text-slate-500 mb-2">{PCT_HINT}</p>
                <p className="text-xs text-slate-400 mb-3">{pn.length} registros</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={criteriosPn} margin={{ top: 22, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f2" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="cumple" name="Cumple" fill="#8b5cf6" stackId="a" isAnimationActive={false}>
                      <LabelList dataKey="pctCumple" content={SegmentLabel} />
                    </Bar>
                    <Bar dataKey="noCumple" name="No Cumple" fill="#e11d48" stackId="a" radius={[4,4,0,0]} isAnimationActive={false}>
                      <LabelList dataKey="pctNoCumple" content={SegmentLabel} />
                      <LabelList dataKey="pctCumple"   content={TotalPctLabel} position="top" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Tablas resumen de indicadores por dispositivo */}
          {avp.length > 0 && (
            <SummaryTableDisp rows={summaryAvp} title="Resumen AVP por Ubicación / Cama" accentColor="indigo" />
          )}
          {cv.length > 0 && (
            <SummaryTableDisp rows={summaryCv}  title="Resumen Catéter Vesical por Ubicación / Cama" accentColor="cyan" />
          )}
          {pn.length > 0 && (
            <SummaryTableDisp rows={summaryPn}  title="Resumen Prevención NAV por Ubicación / Cama" accentColor="violet" />
          )}
        </>
      )}
    </div>
  )
}
