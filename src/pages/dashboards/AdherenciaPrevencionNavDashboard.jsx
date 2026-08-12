import { useEffect, useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList,
  LineChart, Line, ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, Wind, Filter, X, BarChart3, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import DashboardPdfButton from '../../components/common/DashboardPdfButton'
import { filtrosResumen, formatDate } from '../../lib/utils'
import { useSeriesToggle, SegmentLabel, TotalPctLabel, BarPctLabel } from '../../lib/chartLabels'

const CRITERIOS = [
  { key: 'criterio_1_cabecera',              label: 'Cabecera 30–45°' },
  { key: 'criterio_2_higiene_oral',           label: 'Higiene Oral' },
  { key: 'criterio_3_implementos',            label: 'Implementos de Aseo' },
  { key: 'criterio_4_lista_chequeo',          label: 'Lista Chequeo VM' },
  { key: 'criterio_6_interrupcion_sedacion',  label: 'Interrupción Sedación' },
]

const COL_SI = '#059669'   // emerald-600
const COL_NO = '#e11d48'   // rose-600
const COL_NA = '#94a3b8'   // slate-400

const MESES_LABEL = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
const CRITERIO_COLORS = { criterio_1_cabecera: '#2f6fe4', criterio_2_higiene_oral: '#7c3aed', criterio_3_implementos: '#f59e0b', criterio_4_lista_chequeo: '#059669', criterio_6_interrupcion_sedacion: '#0891b2' }

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

function KpiCard({ label, value, sub, color = 'violet', icon: Icon }) {
  const cls = {
    violet: 'kpi-tile kpi-violet', emerald: 'kpi-tile kpi-emerald',
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
      <p className="text-emerald-700 font-semibold">{d.labelSI ?? 'SI'}: {d.SI} ({d.pctSI}%)</p>
      <p className="text-rose-700 font-semibold">{d.labelNO ?? 'NO'}: {d.NO} ({d.pctNO}%)</p>
      {d.NA > 0 && <p className="text-slate-500 font-semibold">N/A: {d.NA} ({d.pctNA}%)</p>}
      <p className="text-slate-500 mt-1">Total: {d.total}</p>
    </div>
  )
}

const INIT_FILTERS = { desde: '', hasta: '' }
const FILTER_LABELS = { desde: 'Desde', hasta: 'Hasta' }

export default function AdherenciaPrevencionNavDashboard() {
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
    supabase.from('encuesta_adherencia_prevencion_nav').select('*')
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

  const rows = useMemo(() => raw.filter(r => {
    if (filters.desde && r.fecha_registro < filters.desde) return false
    if (filters.hasta && r.fecha_registro > filters.hasta) return false
    return true
  }), [raw, filters])

  const hasFilters = Object.values(filters).some(Boolean)
  function setF(k, v) { setFilters(p => ({ ...p, [k]: v })) }

  // ── Tabla de totales por pregunta (SI=1, N/A=1, NO=0) ──────────────
  const tablaPreguntas = useMemo(() => CRITERIOS.map(c => {
    const SI = rows.filter(r => r[c.key] === 'SI').length
    const NO = rows.filter(r => r[c.key] === 'NO').length
    const NA = rows.filter(r => r[c.key] === 'NA').length
    const total = SI + NO + NA
    const cumplimiento = total > 0 ? Math.round(((SI + NA) / total) * 100) : 0
    return { name: c.label, SI, NO, NA, total, pctSI: pct(SI, total), pctNO: pct(NO, total), pctNA: pct(NA, total), cumplimiento }
  }), [rows])

  // ── Criterio 5 — presión del neumotaponador (regla especial) ───────
  const conPresion = useMemo(() => rows.filter(r => r.criterio_5_presion_neumotaponador != null), [rows])
  const fueraRango = useMemo(() => conPresion.filter(r => r.criterio_5_fuera_rango), [conPresion])
  const dentroRango = conPresion.length - fueraRango.length
  const pctFueraRango = pct(fueraRango.length, conPresion.length)

  // ── Datos para gráfico de barras (incluye criterio 5 como Dentro/Fuera) ──
  const barData = useMemo(() => [
    ...tablaPreguntas.map(q => ({
      name: q.name, SI: q.SI, NO: q.NO, NA: q.NA, total: q.total,
      pctSI: q.pctSI, pctNO: q.pctNO, pctNA: q.pctNA, labelSI: 'SI', labelNO: 'NO',
      cumplimiento: q.cumplimiento,
    })),
    {
      name: 'Presión Neumotap.*', SI: dentroRango, NO: fueraRango.length, NA: 0, total: conPresion.length,
      pctSI: pct(dentroRango, conPresion.length), pctNO: pctFueraRango, pctNA: 0,
      labelSI: 'Dentro (22-30)', labelNO: 'Fuera de rango',
      cumplimiento: pct(dentroRango, conPresion.length),
    },
  ], [tablaPreguntas, dentroRango, fueraRango.length, conPresion.length, pctFueraRango])

  // ── Tendencia por fecha: % cumplimiento de cada criterio + % dentro de rango ──
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
      const conP = rowsFecha.filter(r => r.criterio_5_presion_neumotaponador != null)
      const fuera = conP.filter(r => r.criterio_5_fuera_rango).length
      point.presion = pct(conP.length - fuera, conP.length)
      return point
    })
  }, [rows])

  const LINE_COLORS = { criterio_1_cabecera: '#2f6fe4', criterio_2_higiene_oral: '#7c3aed', criterio_3_implementos: '#f59e0b', criterio_4_lista_chequeo: '#059669', criterio_6_interrupcion_sedacion: '#0891b2', presion: '#e11d48' }
  const LINE_LABELS = { criterio_1_cabecera: 'Cabecera', criterio_2_higiene_oral: 'Hig. Oral', criterio_3_implementos: 'Implementos', criterio_4_lista_chequeo: 'Lista Chequeo', criterio_6_interrupcion_sedacion: 'Interr. Sedación', presion: 'Presión dentro de rango' }

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
    const conP = rowsMes.filter(r => r.criterio_5_presion_neumotaponador != null)
    const fuera = conP.filter(r => r.criterio_5_fuera_rango).length
    const dentro = conP.length - fuera
    const pctDentro = conP.length > 0 ? pct(dentro, conP.length) : null
    const pctsValidos = porCriterio.filter(c => c.pctCumple != null).map(c => c.pctCumple)
    const adherenciaGeneral = pctsValidos.length > 0
      ? Math.round(pctsValidos.reduce((s, p) => s + p, 0) / pctsValidos.length) : null
    return { mes: label, total: rowsMes.length, porCriterio, dentro, fuera: fuera, totalPresion: conP.length, pctDentro, adherenciaGeneral }
  }), [raw, anioResumen])

  const resumenValoresChart = useMemo(() => resumenMensual.map(m => {
    const row = { mes: m.mes }
    m.porCriterio.forEach(c => { row[c.key] = c.SI; row[`${c.key}_pct`] = c.pctCumple })
    row.dentroRango = m.dentro
    row.dentroRango_pct = m.pctDentro
    row.fueraRango = m.fuera
    row.fueraRango_pct = m.totalPresion ? (100 - (m.pctDentro ?? 0)) : null
    return row
  }), [resumenMensual])

  const resumenPctChart = useMemo(() => resumenMensual.map(m => {
    const row = { mes: m.mes }
    m.porCriterio.forEach(c => { row[c.key] = c.pctCumple })
    row.presion = m.pctDentro
    row.adherenciaGeneral = m.adherenciaGeneral
    return row
  }), [resumenMensual])

  if (loading) return (
    <div className="p-8 flex justify-center">
      <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const totalPaquete = rows.filter(r => CRITERIOS.every(c => r[c.key] === 'SI' || r[c.key] === 'NA')).length
  const pctPaquete = pct(totalPaquete, rows.length)
  const cumplimientoPromedio = tablaPreguntas.length > 0
    ? Math.round(tablaPreguntas.reduce((s, q) => s + q.cumplimiento, 0) / tablaPreguntas.length) : 0

  return (
    <div ref={pdfRef} className="p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/encuestas/adherencia-prevencion-nav"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
          <Wind className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h1 className="page-title">Dashboard — Adherencia Prevención NAV</h1>
          <p className="page-subtitle">Neumonía asociada a ventilación mecánica · {raw.length} registros totales</p>
        </div>
        <div className="ml-auto" data-pdf-hide>
          <DashboardPdfButton
            targetRef={pdfRef}
            filename="dashboard_adherencia_prevencion_nav"
            title="Dashboard — Adherencia Prevención NAV"
            subtitle={`Neumonía asociada a ventilación mecánica · ${raw.length} registros totales`}
            filtros={filtrosResumen(filters, FILTER_LABELS)}
          />
        </div>
        <Link to="/encuestas/adherencia-prevencion-nav/nuevo" className="ml-auto btn-primary text-xs gap-1.5">
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
        <div className="filters-row" style={{ '--cols': 2 }}>
          <div>
            <label>Desde</label>
            <input type="date" className="input" value={filters.desde} onChange={e => setF('desde', e.target.value)} />
          </div>
          <div>
            <label>Hasta</label>
            <input type="date" className="input" value={filters.hasta} onChange={e => setF('hasta', e.target.value)} />
          </div>
        </div>
        {hasFilters && <p className="text-xs text-violet-600 mt-2">{rows.length} de {raw.length} registros</p>}
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">No hay registros para los filtros seleccionados</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Registros" value={rows.length} sub="Evaluaciones NAV" color="violet" icon={Wind} />
            <KpiCard label="% Cumplimiento Promedio" value={`${cumplimientoPromedio}%`}
              sub="Promedio de las 5 preguntas SI/NO/N-A"
              color={cumplimientoPromedio >= 80 ? 'emerald' : 'red'}
              icon={cumplimientoPromedio >= 80 ? TrendingUp : TrendingDown} />
            <KpiCard label="Paquete Completo" value={`${pctPaquete}%`}
              sub={`${totalPaquete} con las 5 preguntas SI/N-A`}
              color={pctPaquete >= 80 ? 'emerald' : 'amber'} />
            <KpiCard label="Presión Fuera de Rango" value={`${pctFueraRango}%`}
              sub={`${fueraRango.length} de ${conPresion.length} · <22 o >30`}
              color={pctFueraRango > 20 ? 'red' : 'emerald'} icon={AlertTriangle} />
          </div>

          {/* Nota criterio 5 */}
          <div className="card p-3 bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              <strong>Criterio 5 — Presión del neumotaponador:</strong> el rango aceptable es 22–30. Los valores
              <strong> menores a 22 o mayores a 30</strong> se identifican en rojo y se contabilizan como hallazgo (=1)
              en la tabla y las gráficas de esta sección, a diferencia de los demás criterios que usan la
              convención SI=1 / N/A=1 / NO=0.
            </p>
          </div>

          {/* Totales por pregunta: gráfico izquierda · tabla derecha */}
          <div className="card p-5">
            <SH>Totales por Pregunta (SI=1 · N/A=1 · NO=0)</SH>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <div>
                <p className="text-[10px] text-slate-500 mb-2">
                  % dentro de cada barra · verde = SI (o dentro de rango en el criterio 5) · rojo = NO (o fuera de rango) · gris = N/A
                  · <span className="italic">clic en la leyenda para mostrar/ocultar</span>
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData} margin={{ top: 20, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f2" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-15} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip content={<BarTooltip3 />} />
                    <Legend wrapperStyle={{ fontSize: 11, cursor: 'pointer' }} onClick={tglDist.onLegendClick} formatter={tglDist.legendFormatter} />
                    <Bar dataKey="SI" name="SI / Dentro de rango" stackId="a" fill={COL_SI} hide={tglDist.hidden.has('SI')} isAnimationActive={false}>
                      <LabelList dataKey="pctSI" content={SegmentLabel} />
                    </Bar>
                    <Bar dataKey="NA" name="N/A" stackId="a" fill={COL_NA} hide={tglDist.hidden.has('NA')} isAnimationActive={false}>
                      <LabelList dataKey="pctNA" content={SegmentLabel} />
                    </Bar>
                    <Bar dataKey="NO" name="NO / Fuera de rango" stackId="a" fill={COL_NO} radius={[4, 4, 0, 0]} hide={tglDist.hidden.has('NO')} isAnimationActive={false}>
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
                    <tr className="bg-amber-50/70">
                      <td className="px-3 py-1.5 font-medium text-slate-700">Presión Neumotaponador (criterio 5)*</td>
                      <td className="px-2 py-1.5 text-center font-semibold text-emerald-600">{dentroRango}</td>
                      <td className="px-2 py-1.5 text-center text-slate-500">{pct(dentroRango, conPresion.length)}%</td>
                      <td className="px-2 py-1.5 text-center font-semibold text-red-500">{fueraRango.length}</td>
                      <td className="px-2 py-1.5 text-center text-slate-500">{pctFueraRango}%</td>
                      <td className="px-2 py-1.5 text-center text-slate-400" colSpan={2}>N/A no aplica</td>
                      <td className="px-2 py-1.5 text-center text-slate-500">{conPresion.length}</td>
                      <td className="px-2 py-1.5 text-center text-slate-400">ver nota*</td>
                    </tr>
                  </tbody>
                </table>
                <p className="text-[10px] text-slate-500 mt-2">
                  * Criterio 5: "SI" = dentro de rango (22–30) · "NO" = fuera de rango (&lt;22 o &gt;30, cuenta como hallazgo = 1)
                </p>
              </div>
            </div>
          </div>

          {/* Tendencia */}
          <div className="grid grid-cols-1 gap-6">
            {lineData.length > 1 && (
              <div className="card p-5">
                <h3 className="section-title mb-1">Tendencia de % Cumplimiento por Pregunta</h3>
                <p className="text-xs text-slate-400 mb-3">
                  Cada punto = fecha de auditoría · % SI+N/A sobre el total del día (Presión = % dentro de rango 22–30)
                  · <span className="italic">clic en la leyenda para mostrar/ocultar</span>
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={lineData} margin={{ top: 10, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f2" />
                    <XAxis dataKey="fecha" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip formatter={v => `${v}%`} />
                    <Legend wrapperStyle={{ fontSize: 10, cursor: 'pointer' }} onClick={tglTend.onLegendClick} formatter={tglTend.legendFormatter} />
                    {[...CRITERIOS.map(c => c.key), 'presion'].map(key => (
                      <Line key={key} type="monotone" dataKey={key} name={LINE_LABELS[key]}
                        stroke={LINE_COLORS[key]} strokeWidth={2} dot={{ r: 3 }}
                        strokeDasharray={key === 'presion' ? '4 3' : undefined}
                        hide={tglTend.hidden.has(key)}
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
                  <Bar dataKey="dentroRango" name="Dentro Rango (Presión)" fill={COL_SI} hide={tglResVal.hidden.has('dentroRango')} isAnimationActive={false}>
                    <LabelList content={props => <BarPctLabel {...props} pctField="dentroRango_pct" />} />
                  </Bar>
                  <Bar dataKey="fueraRango" name="Fuera Rango (Presión)" fill={COL_NO} hide={tglResVal.hidden.has('fueraRango')} isAnimationActive={false}>
                    <LabelList content={props => <BarPctLabel {...props} pctField="fueraRango_pct" />} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="table-head-brand">
                      <th className="text-left px-2.5 py-2 font-semibold rounded-tl-md">Mes</th>
                      {CRITERIOS.map(c => <th key={c.key} className="text-center px-2 py-2 font-semibold">{c.label}</th>)}
                      <th className="text-center px-2 py-2 font-semibold text-emerald-300">Dentro Rango</th>
                      <th className="text-center px-2 py-2 font-semibold text-red-300">Fuera Rango</th>
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
                        <td className="px-2 py-1.5 text-center font-semibold text-emerald-600">{m.totalPresion ? m.dentro : '—'}</td>
                        <td className="px-2 py-1.5 text-center font-semibold text-red-500">{m.totalPresion ? m.fuera : '—'}</td>
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
                  <Line type="monotone" dataKey="presion" name="Presión Dentro Rango" stroke="#e11d48" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 2 }} connectNulls={false}
                    hide={tglResPct.hidden.has('presion')} isAnimationActive={false} />
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
                      <th className="text-center px-2 py-2 font-semibold">Presión Dentro Rango</th>
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
                        <td className="px-2 py-1.5 text-center text-slate-600">{m.pctDentro != null ? `${m.pctDentro}%` : '—'}</td>
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
