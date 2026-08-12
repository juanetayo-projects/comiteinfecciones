import { useEffect, useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList,
  LineChart, Line, ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, Stethoscope, Filter, X, BarChart3, TrendingUp, TrendingDown } from 'lucide-react'
import DashboardPdfButton from '../../components/common/DashboardPdfButton'
import { filtrosResumen, formatDate } from '../../lib/utils'
import { useSeriesToggle, SegmentLabel, TotalPctLabel, BarPctLabel } from '../../lib/chartLabels'

const CRITERIOS = [
  { key: 'criterio_1_cabecera',        label: 'Cabecera 30–45°' },
  { key: 'criterio_2_higiene_oral',    label: 'Higiene Oral' },
  { key: 'criterio_3_implementos',     label: 'Implementos de Aseo' },
  { key: 'criterio_4_movilizacion',    label: 'Movilización Temprana' },
  { key: 'criterio_5_riesgo_disfagia', label: 'Riesgo Disfagia/Aspiración' },
]

const COL_SI = '#059669'
const COL_NO = '#e11d48'
const COL_NA = '#94a3b8'

const MESES_LABEL = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
const CRITERIO_COLORS = { criterio_1_cabecera: '#2f6fe4', criterio_2_higiene_oral: '#7c3aed', criterio_3_implementos: '#f59e0b', criterio_4_movilizacion: '#059669', criterio_5_riesgo_disfagia: '#e11d48' }

function pct(n, total) { return total > 0 ? Math.round((n / total) * 100) : 0 }
function yearOf(f) { return f ? Number(f.slice(0, 4)) : null }
function monthOf(f) { return f ? Number(f.slice(5, 7)) : null }

function SH({ children }) {
  return (
    <div className="px-3.5 py-2.5 bg-brand-gradient border-l-4 border-accent-400 rounded-r-xl shadow-neu-sm mb-4">
      <h3 className="text-sm font-semibold text-white tracking-wide">{children}</h3>
    </div>
  )
}

function KpiCard({ label, value, sub, color = 'cyan', icon: Icon }) {
  const cls = {
    cyan: 'kpi-tile kpi-blue', emerald: 'kpi-tile kpi-emerald',
    red: 'kpi-tile kpi-red', amber: 'kpi-tile kpi-amber', slate: 'kpi-tile kpi-slate',
  }[color] ?? 'kpi-tile kpi-slate'
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

function BarTooltip3({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-xl bg-white/95 shadow-neu px-3 py-2 text-xs border border-white">
      <p className="font-bold text-brand-900 mb-1">{label}</p>
      <p className="text-emerald-700 font-semibold">SI: {d.SI} ({d.pctSI}%)</p>
      <p className="text-rose-700 font-semibold">NO: {d.NO} ({d.pctNO}%)</p>
      {d.NA > 0 && <p className="text-slate-500 font-semibold">N/A: {d.NA} ({d.pctNA}%)</p>}
      <p className="text-slate-500 mt-1">Total: {d.total}</p>
    </div>
  )
}

const INIT_FILTERS = { desde: '', hasta: '', servicio: '' }
const FILTER_LABELS = { desde: 'Desde', hasta: 'Hasta', servicio: 'Servicio' }

export default function AdherenciaPrevencionNcDashboard() {
  const [raw,     setRaw]     = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(INIT_FILTERS)
  const [anioResumen, setAnioResumen] = useState(new Date().getFullYear())
  const pdfRef = useRef(null)

  // Mostrar/ocultar series haciendo clic en la leyenda de cada gráfico
  const tglDist   = useSeriesToggle()
  const tglTend   = useSeriesToggle()
  const tglResVal = useSeriesToggle()
  const tglResPct = useSeriesToggle()

  useEffect(() => {
    supabase.from('encuesta_adherencia_prevencion_nc').select('*')
      .order('fecha_registro', { ascending: true })
      .then(({ data }) => { setRaw(data ?? []); setLoading(false) })
  }, [])

  const aniosDisponibles = useMemo(
    () => [...new Set(raw.map(r => yearOf(r.fecha_registro)).filter(Boolean))].sort((a, b) => b - a),
    [raw]
  )
  useEffect(() => {
    if (aniosDisponibles.length > 0 && !aniosDisponibles.includes(anioResumen)) setAnioResumen(aniosDisponibles[0])
  }, [aniosDisponibles])

  const servicios = useMemo(() => [...new Set(raw.map(r => r.servicio).filter(Boolean))].sort(), [raw])

  const rows = useMemo(() => raw.filter(r => {
    if (filters.desde && r.fecha_registro < filters.desde) return false
    if (filters.hasta && r.fecha_registro > filters.hasta) return false
    if (filters.servicio && r.servicio !== filters.servicio) return false
    return true
  }), [raw, filters])

  const hasFilters = Object.values(filters).some(Boolean)
  function setF(k, v) { setFilters(p => ({ ...p, [k]: v })) }

  const tablaPreguntas = useMemo(() => CRITERIOS.map(c => {
    const SI = rows.filter(r => r[c.key] === 'SI').length
    const NO = rows.filter(r => r[c.key] === 'NO').length
    const NA = rows.filter(r => r[c.key] === 'NA').length
    const total = SI + NO + NA
    const cumplimiento = total > 0 ? Math.round(((SI + NA) / total) * 100) : 0
    return { name: c.label, SI, NO, NA, total, pctSI: pct(SI, total), pctNO: pct(NO, total), pctNA: pct(NA, total), cumplimiento }
  }), [rows])

  const barData = useMemo(() => tablaPreguntas.map(q => ({ ...q })), [tablaPreguntas])

  const lineData = useMemo(() => {
    const fechas = [...new Set(rows.map(r => r.fecha_registro))].sort()
    return fechas.map(fecha => {
      const rowsFecha = rows.filter(r => r.fecha_registro === fecha)
      const point = { fecha: formatDate(fecha) }
      CRITERIOS.forEach(c => {
        const SI = rowsFecha.filter(r => r[c.key] === 'SI').length
        const NA = rowsFecha.filter(r => r[c.key] === 'NA').length
        point[c.key] = pct(SI + NA, rowsFecha.length)
      })
      return point
    })
  }, [rows])

  const LINE_COLORS = { criterio_1_cabecera: '#2f6fe4', criterio_2_higiene_oral: '#7c3aed', criterio_3_implementos: '#f59e0b', criterio_4_movilizacion: '#059669', criterio_5_riesgo_disfagia: '#e11d48' }

  // ── Resumen mensual del año seleccionado (valores + %) ──────────────
  const resumenMensual = useMemo(() => MESES_LABEL.map((label, i) => {
    const mesNum = i + 1
    const rowsMes = raw.filter(r => yearOf(r.fecha_registro) === anioResumen && monthOf(r.fecha_registro) === mesNum)
    const porCriterio = CRITERIOS.map(c => {
      const SI = rowsMes.filter(r => r[c.key] === 'SI').length
      const NA = rowsMes.filter(r => r[c.key] === 'NA').length
      const NO = rowsMes.filter(r => r[c.key] === 'NO').length
      const tot = SI + NA + NO
      return { key: c.key, label: c.label, SI, pctCumple: tot > 0 ? pct(SI + NA, tot) : null }
    })
    const pctsValidos = porCriterio.filter(c => c.pctCumple != null).map(c => c.pctCumple)
    const adherenciaGeneral = pctsValidos.length > 0
      ? Math.round(pctsValidos.reduce((s, p) => s + p, 0) / pctsValidos.length) : null
    return { mes: label, total: rowsMes.length, porCriterio, adherenciaGeneral }
  }), [raw, anioResumen])

  const resumenValoresChart = useMemo(() => resumenMensual.map(m => {
    const row = { mes: m.mes }
    m.porCriterio.forEach(c => { row[c.key] = c.SI; row[`${c.key}_pct`] = c.pctCumple })
    return row
  }), [resumenMensual])

  const resumenPctChart = useMemo(() => resumenMensual.map(m => {
    const row = { mes: m.mes }
    m.porCriterio.forEach(c => { row[c.key] = c.pctCumple })
    row.adherenciaGeneral = m.adherenciaGeneral
    return row
  }), [resumenMensual])

  if (loading) return (
    <div className="p-8 flex justify-center">
      <div className="w-8 h-8 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const totalPaquete = rows.filter(r => CRITERIOS.every(c => r[c.key] === 'SI' || r[c.key] === 'NA')).length
  const pctPaquete = pct(totalPaquete, rows.length)
  const cumplimientoPromedio = tablaPreguntas.length > 0
    ? Math.round(tablaPreguntas.reduce((s, q) => s + q.cumplimiento, 0) / tablaPreguntas.length) : 0
  const totalNO = tablaPreguntas.reduce((s, q) => s + q.NO, 0)

  return (
    <div ref={pdfRef} className="p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/encuestas/adherencia-prevencion-nc"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-9 h-9 rounded-xl bg-cyan-100 flex items-center justify-center">
          <Stethoscope className="w-5 h-5 text-cyan-600" />
        </div>
        <div>
          <h1 className="page-title">Dashboard — Adherencia Prevención NC</h1>
          <p className="page-subtitle">Neumonía clínica / intrahospitalaria · {raw.length} registros totales</p>
        </div>
        <div className="ml-auto" data-pdf-hide>
          <DashboardPdfButton
            targetRef={pdfRef}
            filename="dashboard_adherencia_prevencion_nc"
            title="Dashboard — Adherencia Prevención NC"
            subtitle={`Neumonía clínica / intrahospitalaria · ${raw.length} registros totales`}
            filtros={filtrosResumen(filters, FILTER_LABELS)}
          />
        </div>
        <Link to="/encuestas/adherencia-prevencion-nc/nuevo" className="ml-auto btn-primary text-xs gap-1.5">
          <BarChart3 className="w-3.5 h-3.5" /> Nuevo Registro
        </Link>
      </div>

      {/* Filtros */}
      <div className="card p-4" data-pdf-hide>
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Filtros</span>
          {hasFilters && (
            <button onClick={() => setFilters(INIT_FILTERS)}
              className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-red-600">
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}
        </div>
        <div className="filters-row" style={{ '--cols': 3 }}>
          <div>
            <label>Desde</label>
            <input type="date" className="input" value={filters.desde} onChange={e => setF('desde', e.target.value)} />
          </div>
          <div>
            <label>Hasta</label>
            <input type="date" className="input" value={filters.hasta} onChange={e => setF('hasta', e.target.value)} />
          </div>
          <div>
            <label>Servicio</label>
            <select className="input" value={filters.servicio} onChange={e => setF('servicio', e.target.value)}>
              <option value="">Todos</option>
              {servicios.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {hasFilters && <p className="text-xs text-cyan-600 mt-2">{rows.length} de {raw.length} registros</p>}
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">No hay registros para los filtros seleccionados</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Registros" value={rows.length} sub="Evaluaciones NC" color="cyan" icon={Stethoscope} />
            <KpiCard label="% Cumplimiento Promedio" value={`${cumplimientoPromedio}%`}
              sub="Promedio de las 5 preguntas SI/NO/N-A"
              color={cumplimientoPromedio >= 80 ? 'emerald' : 'red'}
              icon={cumplimientoPromedio >= 80 ? TrendingUp : TrendingDown} />
            <KpiCard label="Paquete Completo" value={`${pctPaquete}%`}
              sub={`${totalPaquete} con las 5 preguntas SI/N-A`}
              color={pctPaquete >= 80 ? 'emerald' : 'amber'} />
            <KpiCard label="Hallazgos NO" value={totalNO}
              sub="Suma de respuestas NO en las 5 preguntas" color="red" />
          </div>

          {/* Totales por pregunta: gráfico izquierda · tabla derecha */}
          <div className="card p-5">
            <SH>Totales por Pregunta (SI=1 · N/A=1 · NO=0)</SH>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <div>
                <p className="text-[10px] text-slate-500 mb-2">
                  % dentro de cada barra · verde = SI · rojo = NO · gris = N/A
                  · <span className="italic">clic en la leyenda para mostrar/ocultar</span>
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData} margin={{ top: 20, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f2" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip content={<BarTooltip3 />} />
                    <Legend wrapperStyle={{ fontSize: 11, cursor: 'pointer' }} onClick={tglDist.onLegendClick} formatter={tglDist.legendFormatter} />
                    <Bar dataKey="SI" name="SI" stackId="a" fill={COL_SI} hide={tglDist.hidden.has('SI')} isAnimationActive={false}>
                      <LabelList dataKey="pctSI" content={SegmentLabel} />
                    </Bar>
                    <Bar dataKey="NA" name="N/A" stackId="a" fill={COL_NA} hide={tglDist.hidden.has('NA')} isAnimationActive={false}>
                      <LabelList dataKey="pctNA" content={SegmentLabel} />
                    </Bar>
                    <Bar dataKey="NO" name="NO" stackId="a" fill={COL_NO} radius={[4, 4, 0, 0]} hide={tglDist.hidden.has('NO')} isAnimationActive={false}>
                      <LabelList dataKey="pctNO" content={SegmentLabel} />
                      <LabelList dataKey="cumplimiento" content={TotalPctLabel} position="top" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="table-head-brand">
                      <th className="text-left px-3 py-2 font-semibold rounded-tl-lg">Pregunta</th>
                      <th className="text-center px-2 py-2 font-semibold text-emerald-300">SI</th>
                      <th className="text-center px-2 py-2 font-semibold">%</th>
                      <th className="text-center px-2 py-2 font-semibold text-red-300">NO</th>
                      <th className="text-center px-2 py-2 font-semibold">%</th>
                      <th className="text-center px-2 py-2 font-semibold">N/A</th>
                      <th className="text-center px-2 py-2 font-semibold">%</th>
                      <th className="text-center px-2 py-2 font-semibold">Total</th>
                      <th className="text-center px-2 py-2 font-semibold rounded-tr-lg">% Cumplimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tablaPreguntas.map((q, i) => (
                      <tr key={q.name} className={`border-b border-white/70 ${i % 2 === 1 ? 'bg-white/55' : ''}`}>
                        <td className="px-3 py-1.5 font-medium text-slate-700">{q.name}</td>
                        <td className="px-2 py-1.5 text-center font-semibold text-emerald-600">{q.SI}</td>
                        <td className="px-2 py-1.5 text-center text-slate-500">{q.pctSI}%</td>
                        <td className="px-2 py-1.5 text-center font-semibold text-red-500">{q.NO}</td>
                        <td className="px-2 py-1.5 text-center text-slate-500">{q.pctNO}%</td>
                        <td className="px-2 py-1.5 text-center text-slate-500">{q.NA}</td>
                        <td className="px-2 py-1.5 text-center text-slate-500">{q.pctNA}%</td>
                        <td className="px-2 py-1.5 text-center text-slate-500">{q.total}</td>
                        <td className="px-2 py-1.5 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded-full font-semibold
                            ${q.cumplimiento >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {q.cumplimiento}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Tendencia */}
          <div className="grid grid-cols-1 gap-6">
            {lineData.length > 1 && (
              <div className="card p-5">
                <h3 className="section-title mb-1">Tendencia de % Cumplimiento por Pregunta</h3>
                <p className="text-xs text-slate-400 mb-3">
                  Cada punto = fecha de auditoría · % SI+N/A sobre el total del día
                  · <span className="italic">clic en la leyenda para mostrar/ocultar</span>
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={lineData} margin={{ top: 10, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f2" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip formatter={v => `${v}%`} />
                    <Legend wrapperStyle={{ fontSize: 10, cursor: 'pointer' }} onClick={tglTend.onLegendClick} formatter={tglTend.legendFormatter} />
                    {CRITERIOS.map(c => (
                      <Line key={c.key} type="monotone" dataKey={c.key} name={c.label}
                        stroke={LINE_COLORS[c.key]} strokeWidth={2} dot={{ r: 3 }}
                        hide={tglTend.hidden.has(c.key)}
                        connectNulls isAnimationActive={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Resumen Mensual por Año */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-bold text-brand-900">Resumen Mensual — {anioResumen}</h2>
            <select className="input w-28" value={anioResumen} onChange={e => setAnioResumen(Number(e.target.value))} data-pdf-hide>
              {(aniosDisponibles.length ? aniosDisponibles : [anioResumen]).map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* VALORES: gráfico izquierda · tabla derecha */}
          <div className="card p-5">
            <SH>Resumen Mensual — Valores (conteo de SI por criterio)</SH>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <div>
                <p className="text-[10px] text-slate-500 mb-2">% sobre el total de registros del mes para cada criterio</p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={resumenValoresChart} margin={{ top: 20, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f2" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 10, cursor: 'pointer' }} onClick={tglResVal.onLegendClick} formatter={tglResVal.legendFormatter} />
                    {CRITERIOS.map(c => (
                      <Bar key={c.key} dataKey={c.key} name={c.label} fill={CRITERIO_COLORS[c.key]} hide={tglResVal.hidden.has(c.key)} isAnimationActive={false}>
                        <LabelList content={props => <BarPctLabel {...props} pctField={`${c.key}_pct`} />} />
                      </Bar>
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="table-head-brand">
                      <th className="text-left px-2.5 py-2 font-semibold rounded-tl-md">Mes</th>
                      {CRITERIOS.map(c => <th key={c.key} className="text-center px-2 py-2 font-semibold">{c.label}</th>)}
                      <th className="text-center px-2 py-2 font-semibold rounded-tr-md">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenMensual.map((m, i) => (
                      <tr key={m.mes} className={`border-b border-white/70 ${i % 2 === 1 ? 'bg-white/55' : ''}`}>
                        <td className="px-2.5 py-1.5 text-slate-700 font-medium">{m.mes}</td>
                        {m.porCriterio.map(c => (
                          <td key={c.key} className="px-2 py-1.5 text-center text-slate-600">{m.total ? c.SI : '—'}</td>
                        ))}
                        <td className="px-2 py-1.5 text-center text-slate-500">{m.total || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* PORCENTAJES: gráfico izquierda · tabla derecha */}
          <div className="card p-5">
            <SH>Resumen Mensual — % Adherencia</SH>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={resumenPctChart} margin={{ top: 10, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f2" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip formatter={v => v == null ? 'Sin datos' : `${v}%`} />
                  <Legend wrapperStyle={{ fontSize: 10, cursor: 'pointer' }} onClick={tglResPct.onLegendClick} formatter={tglResPct.legendFormatter} />
                  {CRITERIOS.map(c => (
                    <Line key={c.key} type="monotone" dataKey={c.key} name={c.label}
                      stroke={CRITERIO_COLORS[c.key]} strokeWidth={1.5} dot={{ r: 2 }} connectNulls={false}
                      hide={tglResPct.hidden.has(c.key)} isAnimationActive={false} />
                  ))}
                  <Line type="monotone" dataKey="adherenciaGeneral" name="Adherencia General" stroke="#0d2d6b" strokeWidth={3} dot={{ r: 3 }} connectNulls={false}
                    hide={tglResPct.hidden.has('adherenciaGeneral')} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="table-head-brand">
                      <th className="text-left px-2.5 py-2 font-semibold rounded-tl-md">Mes</th>
                      {CRITERIOS.map(c => <th key={c.key} className="text-center px-2 py-2 font-semibold">{c.label}</th>)}
                      <th className="text-center px-2 py-2 font-semibold rounded-tr-md">Adherencia General</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumenMensual.map((m, i) => (
                      <tr key={m.mes} className={`border-b border-white/70 ${i % 2 === 1 ? 'bg-white/55' : ''}`}>
                        <td className="px-2.5 py-1.5 text-slate-700 font-medium">{m.mes}</td>
                        {m.porCriterio.map(c => (
                          <td key={c.key} className="px-2 py-1.5 text-center text-slate-600">{c.pctCumple != null ? `${c.pctCumple}%` : '—'}</td>
                        ))}
                        <td className="px-2 py-1.5 text-center">
                          {m.adherenciaGeneral != null
                            ? <span className={`inline-block px-1.5 py-0.5 rounded-full font-semibold
                                ${m.adherenciaGeneral >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {m.adherenciaGeneral}%
                              </span>
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
