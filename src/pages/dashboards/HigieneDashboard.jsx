import { useEffect, useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, Hand, Filter, X, FileSpreadsheet, Loader2 } from 'lucide-react'
import DashboardPdfButton from '../../components/common/DashboardPdfButton'
import DataTable from '../../components/common/DataTable'
import { exportToExcel } from '../../lib/exportUtils'
import DetalleGraficaModal, { COL_FECHA, COL_ESTADO, colCumple }
  from '../../components/common/DetalleGraficaModal'
import { filtrosResumen, porcentaje, formatDate, estadoLabel } from '../../lib/utils'
import {
  buildBarData, withPct, withCriterioPct, SegmentLabel, TotalPctLabel, TopLabel, BarTooltip,
  BAR_CUMPLE, BAR_NO_CUMPLE, PIE_COLORS, PCT_HINT, useSeriesToggle,
} from '../../lib/chartLabels'

// Columnas del detalle que se abre al pulsar una gráfica
const COLS_DETALLE = [
  COL_FECHA,
  { key: 'servicio_evaluado',  header: 'Servicio' },
  { key: 'nombre_evaluado',    header: 'Evaluado' },
  { key: 'perfil_colaborador', header: 'Perfil' },
  { key: 'sumatoria_cumplimiento', header: 'Momentos', render: v => `${v ?? 0}/5` },
  colCumple('resultado_cumplimiento', 'Resultado'),
  COL_ESTADO,
]

function KpiCard({ label, value, sub, color = 'slate' }) {
  const cls = {
    emerald: 'kpi-tile kpi-emerald',
    red:     'kpi-tile kpi-red',
    indigo:  'kpi-tile kpi-indigo',
    blue:    'kpi-tile kpi-blue',
    slate:   'kpi-tile kpi-slate',
  }[color]
  return (
    <div className={`card p-4 ${cls}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs font-medium mt-0.5">{label}</p>
      {sub && <p className="text-[11px] opacity-70 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Tabla de registros del periodo (con los 5 momentos) ───────
const MOMENTOS = [1, 2, 3, 4, 5].map(n => `momento_${n}`)
const MOMENTO_TITULOS = [
  'Antes de tocar al paciente',
  'Antes de procedimiento aséptico',
  'Tras riesgo de exposición a fluidos',
  'Después de tocar al paciente',
  'Después del entorno del paciente',
]

const MOMENTO_CORTOS = ['M1 Antes de tocar', 'M2 Antes aséptico', 'M3 Tras fluidos', 'M4 Tras tocar', 'M5 Tras entorno']

function momentoBadge(v) {
  if (v === 'CUMPLE')    return 'bg-emerald-100 text-emerald-800'
  if (v === 'NO CUMPLE') return 'bg-red-100 text-red-800'
  return 'bg-slate-100 text-slate-500'
}

// unas_cortas_esmalte / porta_accesorios se guardan como texto 'true'/'false'
const siNo = v => v === true || v === 'true' ? 'SI' : v === false || v === 'false' ? 'NO' : ''

const COLS_REGISTROS = [
  { key: 'fecha_evaluacion',   header: 'Fecha', sortable: true,
    render: v => <span className="whitespace-nowrap">{formatDate(v)}</span> },
  { key: 'servicio_evaluado',  header: 'Servicio', sortable: true },
  { key: 'nombre_evaluado',    header: 'Evaluado', sortable: true },
  { key: 'perfil_colaborador', header: 'Perfil', sortable: true },
  ...MOMENTOS.map((k, i) => ({
    key: k, header: `M${i + 1}`,
    render: v => v
      ? <span className={`badge whitespace-nowrap ${momentoBadge(v)}`} title={MOMENTO_TITULOS[i]}>{v}</span>
      : '—',
  })),
  { key: 'sumatoria_cumplimiento', header: 'Suma', sortable: true, render: v => `${v ?? 0}/5` },
  { key: 'resultado_cumplimiento', header: 'Resultado', sortable: true,
    render: v => <span className={`badge ${momentoBadge(v)}`}>{v || '—'}</span> },
]

const EXPORT_COLS_REGISTROS = [
  { key: 'fecha_evaluacion',   label: 'Fecha',    width: 12 },
  { key: 'servicio_evaluado',  label: 'Servicio', width: 20 },
  { key: 'nombre_evaluado',    label: 'Evaluado', width: 26 },
  { key: 'perfil_colaborador', label: 'Perfil',   width: 18 },
  ...MOMENTOS.map((k, i) => ({ key: k, label: `M${i + 1} ${MOMENTO_TITULOS[i]}`, width: 18 })),
  { key: 'sumatoria_cumplimiento',  label: 'Sumatoria',          width: 10 },
  { key: 'resultado_cumplimiento',  label: 'Resultado',          width: 12 },
  { key: 'soporte_no_cumplimiento', label: 'Soporte No Cumpl.',  width: 24 },
  { key: 'unas_cortas_esmalte',     label: 'Uñas cortas/sin esmalte', width: 12 },
  { key: 'porta_accesorios',        label: 'Porta accesorios',   width: 12 },
  { key: 'retroalimenta_trabajador', label: 'Retroalimenta',     width: 12 },
  { key: 'observaciones',           label: 'Observaciones',      width: 30 },
  { key: 'nombre_quien_diligencia', label: 'Diligenciado por',   width: 22 },
  { key: 'estado',                  label: 'Estado',             width: 12 },
]

const INIT_FILTERS = { desde: '', hasta: '', servicio: '', perfil: '' }
// Etiquetas legibles de los filtros — se imprimen en el encabezado del PDF
const FILTER_LABELS = { desde:'Desde', hasta:'Hasta', servicio:'Servicio', perfil:'Perfil' }

export default function HigieneDashboard() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(INIT_FILTERS)
  const pdfRef = useRef(null)
  const tglServicio = useSeriesToggle()
  const tglPerfil = useSeriesToggle()
  // Detalle de las encuestas que hay detrás del valor de una gráfica
  const [detalle, setDetalle] = useState(null)
  const abrirDetalle = (titulo, rows) =>
    setDetalle({ titulo, subtitulo: `${rows.length} encuesta(s) · según los filtros aplicados`, rows })

  useEffect(() => {
    supabase.from('encuesta_higiene_manos').select('*').order('fecha_evaluacion', { ascending: false })
      .then(({ data: rows }) => { setData(rows ?? []); setLoading(false) })
  }, [])

  const servicios = useMemo(() => [...new Set(data.map(r => r.servicio_evaluado).filter(Boolean))].sort(), [data])
  const perfiles  = useMemo(() => [...new Set(data.map(r => r.perfil_colaborador).filter(Boolean))].sort(), [data])

  const filtered = useMemo(() => {
    return data.filter(r => {
      if (filters.desde   && r.fecha_evaluacion < filters.desde)                return false
      if (filters.hasta   && r.fecha_evaluacion > filters.hasta)                return false
      if (filters.servicio && r.servicio_evaluado !== filters.servicio)         return false
      if (filters.perfil  && r.perfil_colaborador !== filters.perfil)           return false
      return true
    })
  }, [data, filters])

  // Cumplimiento por momento para un servicio: respeta fechas y perfil, y el
  // servicio se elige en la propia gráfica (por defecto, el del filtro general).
  // Sólo cuentan los momentos evaluados (CUMPLE / NO CUMPLE).
  const [servicioMom, setServicioMom] = useState('')
  useEffect(() => { setServicioMom(filters.servicio) }, [filters.servicio])
  const tglMomentos = useSeriesToggle()

  const momentosServicio = useMemo(() => {
    const filas = data.filter(r => {
      if (filters.desde  && r.fecha_evaluacion < filters.desde)      return false
      if (filters.hasta  && r.fecha_evaluacion > filters.hasta)      return false
      if (filters.perfil && r.perfil_colaborador !== filters.perfil) return false
      if (servicioMom    && r.servicio_evaluado !== servicioMom)     return false
      return true
    })
    return withCriterioPct(MOMENTOS.map((k, i) => ({
      name:     MOMENTO_CORTOS[i],
      titulo:   MOMENTO_TITULOS[i],
      cumple:   filas.filter(r => r[k] === 'CUMPLE').length,
      noCumple: filas.filter(r => r[k] === 'NO CUMPLE').length,
    })))
  }, [data, filters.desde, filters.hasta, filters.perfil, servicioMom])
  const hayMomentos = momentosServicio.some(m => m.cumple + m.noCumple > 0)

  const [exportando, setExportando] = useState(false)
  async function exportarRegistros() {
    setExportando(true)
    try {
      await exportToExcel(
        filtered.map(r => ({
          ...r,
          unas_cortas_esmalte:      siNo(r.unas_cortas_esmalte),
          porta_accesorios:         siNo(r.porta_accesorios),
          retroalimenta_trabajador: siNo(r.retroalimenta_trabajador),
          estado:                   estadoLabel(r.estado),
        })),
        EXPORT_COLS_REGISTROS,
        'higiene_manos_registros',
        'Higiene de Manos — Registros del periodo',
        'Clínica de Alta Complejidad Santa Bárbara',
        filtrosResumen(filters, FILTER_LABELS),
      )
    } finally {
      setExportando(false)
    }
  }

  const hasFilters = Object.values(filters).some(Boolean)
  function clearFilters() { setFilters(INIT_FILTERS) }
  function setF(key, val) { setFilters(prev => ({ ...prev, [key]: val })) }

  // Tabla independiente por servicio — DEBE estar ANTES del return condicional (Rules of Hooks)
  const tablasPorServicio = useMemo(() => {
    const serviciosSet = [...new Set(filtered.map(r => r.servicio_evaluado || 'Sin servicio'))].sort()
    return serviciosSet.map(servicio => {
      const filas = filtered.filter(r => (r.servicio_evaluado || 'Sin servicio') === servicio)
      const perfilMap = {}
      filas.forEach(r => {
        const p = r.perfil_colaborador || 'Sin perfil'
        if (!perfilMap[p]) perfilMap[p] = { perfil: p, total: 0, cumple: 0, noCumple: 0, sumTotal: 0 }
        perfilMap[p].total++
        perfilMap[p].sumTotal += r.sumatoria_cumplimiento ?? 0
        if (r.resultado_cumplimiento === 'CUMPLE') perfilMap[p].cumple++
        else perfilMap[p].noCumple++
      })
      const perfiles = Object.values(perfilMap).map(p => ({
        ...p,
        pct:     Math.round((p.cumple / p.total) * 100) || 0,
        avgSuma: p.total > 0 ? (p.sumTotal / p.total).toFixed(1) : '0',
      })).sort((a, b) => a.perfil.localeCompare(b.perfil))
      return { servicio, totalRegistros: filas.length, perfiles }
    })
  }, [filtered])

  if (loading) return (
    <div className="p-8 flex justify-center">
      <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const total    = filtered.length
  const cumple   = filtered.filter(r => r.resultado_cumplimiento === 'CUMPLE').length
  const noCumple = total - cumple
  const pct      = total > 0 ? Math.round((cumple / total) * 100) : 0
  const avgSumatoria = total > 0
    ? (filtered.reduce((s, r) => s + (r.sumatoria_cumplimiento ?? 0), 0) / total).toFixed(1)
    : 0

  const pieData = [
    { name: 'CUMPLE',    value: cumple },
    { name: 'NO CUMPLE', value: noCumple },
  ].filter(d => d.value > 0)

  const esCumple = r => r.resultado_cumplimiento === 'CUMPLE'
  const barServicio = buildBarData(filtered, 'servicio_evaluado',  'Sin servicio', esCumple)
  const barPerfil   = buildBarData(filtered, 'perfil_colaborador', 'Sin perfil',   esCumple)

  const sumDist = withPct(
    [0,1,2,3,4,5].map(v => ({
      name: `${v}/5`,
      cantidad: filtered.filter(r => r.sumatoria_cumplimiento === v).length,
    })),
    'cantidad', total
  )

  // Soporte de No Cumplimiento — solo tiene sentido sobre los registros NO CUMPLE
  const soporteData = Object.entries(
    filtered
      .filter(r => r.resultado_cumplimiento === 'NO CUMPLE' && r.soporte_no_cumplimiento)
      .reduce((acc, r) => {
        acc[r.soporte_no_cumplimiento] = (acc[r.soporte_no_cumplimiento] ?? 0) + 1
        return acc
      }, {})
  )
    .map(([name, cantidad]) => ({ name, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad)

  return (
    <div ref={pdfRef} className="p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/encuestas/higiene-manos"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
          <Hand className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="page-title">Dashboard — Higiene de Manos</h1>
          <p className="page-subtitle">Cumplimiento de los 5 momentos OMS</p>
        </div>
        <div className="ml-auto" data-pdf-hide>
          <DashboardPdfButton
            targetRef={pdfRef}
            filename="dashboard_higiene_manos"
            title="Dashboard — Higiene de Manos"
            subtitle="Cumplimiento de los 5 momentos OMS"
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
        <div className="filters-row" style={{ '--cols': 4 }}>
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
            <label>Servicio</label>
            <select className="input" value={filters.servicio} onChange={e => setF('servicio', e.target.value)}>
              <option value="">Todos</option>
              {servicios.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label>Perfil Colaborador</label>
            <select className="input" value={filters.perfil} onChange={e => setF('perfil', e.target.value)}>
              <option value="">Todos</option>
              {perfiles.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        {hasFilters && (
          <p className="text-xs text-brand-600 mt-2">{total} de {data.length} registros mostrados</p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Observaciones" value={total}         color="indigo" />
        <KpiCard label="Cumplimiento Global"  value={`${pct}%`}    color={pct >= 80 ? 'emerald' : 'red'} sub={`${cumple} CUMPLE`} />
        <KpiCard label="Prom. Sumatoria"      value={avgSumatoria} color="blue" sub="momentos / observación" />
        <KpiCard label="NO CUMPLE"            value={noCumple}     color="red" />
      </div>

      {total === 0 ? (
        <div className="card p-8 text-center text-slate-400">No hay registros para los filtros seleccionados</div>
      ) : (
        <>
          {/* Gráficas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="section-title mb-4">Resultado Global</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={90}
                    dataKey="value" cursor="pointer"
                    label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                    labelLine={false}
                    onClick={d => abrirDetalle(`Resultado — ${d.name}`, filtered.filter(r => (r.resultado_cumplimiento === 'CUMPLE' ? 'CUMPLE' : 'NO CUMPLE') === d.name))}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="section-title mb-1">Distribución Sumatoria (0–5 momentos)</h3>
              <p className="text-[10px] text-slate-500 mb-2">Cantidad y % sobre el total de observaciones</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sumDist} margin={{ top: 22, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f2" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v, _n, p) => [`${v} (${p.payload.pct}%)`, 'Observaciones']} />
                  <Bar dataKey="cantidad" fill="#2f6fe4" radius={[4,4,0,0]} isAnimationActive={false}>
                    <LabelList dataKey="etiqueta" content={TopLabel} position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="section-title mb-1">Cumplimiento por Servicio</h3>
              <p className="text-[10px] text-slate-500 mb-2">{PCT_HINT}</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barServicio} margin={{ top: 22, left: -10 }}
                  onClick={(e) => {
                    const cat = e?.activeLabel
                    if (cat) abrirDetalle(`Servicio — ${cat}`,
                      filtered.filter(r => (r.servicio_evaluado || 'Sin servicio') === cat))
                  }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f2" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(31,86,196,0.06)' }} />
                  <Legend wrapperStyle={{ fontSize: 11, cursor: 'pointer' }} onClick={tglServicio.onLegendClick} formatter={tglServicio.legendFormatter} />
                  <Bar dataKey="CUMPLE" fill={BAR_CUMPLE} stackId="a" hide={tglServicio.hidden.has('CUMPLE')} isAnimationActive={false}>
                    <LabelList dataKey="pctCumple" content={SegmentLabel} />
                  </Bar>
                  <Bar dataKey="NO CUMPLE" fill={BAR_NO_CUMPLE} stackId="a" radius={[4,4,0,0]} hide={tglServicio.hidden.has('NO CUMPLE')} isAnimationActive={false}>
                    <LabelList dataKey="pctNoCumple" content={SegmentLabel} />
                    <LabelList dataKey="pctCumple"   content={TotalPctLabel} position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="section-title mb-1">Cumplimiento por Perfil</h3>
              <p className="text-[10px] text-slate-500 mb-2">{PCT_HINT}</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barPerfil} margin={{ top: 22, left: -10 }}
                  onClick={(e) => {
                    const cat = e?.activeLabel
                    if (cat) abrirDetalle(`Perfil — ${cat}`,
                      filtered.filter(r => (r.perfil_colaborador || 'Sin perfil') === cat))
                  }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f2" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(31,86,196,0.06)' }} />
                  <Legend wrapperStyle={{ fontSize: 11, cursor: 'pointer' }} onClick={tglPerfil.onLegendClick} formatter={tglPerfil.legendFormatter} />
                  <Bar dataKey="CUMPLE" fill={BAR_CUMPLE} stackId="a" hide={tglPerfil.hidden.has('CUMPLE')} isAnimationActive={false}>
                    <LabelList dataKey="pctCumple" content={SegmentLabel} />
                  </Bar>
                  <Bar dataKey="NO CUMPLE" fill={BAR_NO_CUMPLE} stackId="a" radius={[4,4,0,0]} hide={tglPerfil.hidden.has('NO CUMPLE')} isAnimationActive={false}>
                    <LabelList dataKey="pctNoCumple" content={SegmentLabel} />
                    <LabelList dataKey="pctCumple"   content={TotalPctLabel} position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cumplimiento por momento OMS para el servicio elegido */}
          <div className="card p-5">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
              <div>
                <h3 className="section-title mb-1">
                  Cumplimiento por Momento — {servicioMom || 'Todos los servicios'}
                </h3>
                <p className="text-[10px] text-slate-500">
                  {PCT_HINT} · sólo momentos evaluados (excluye NO EVALUADO / NO APLICA)
                </p>
              </div>
              <select className="input w-64 max-w-full text-xs" value={servicioMom}
                onChange={e => setServicioMom(e.target.value)} data-pdf-hide>
                <option value="">Todos los servicios</option>
                {servicios.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {!hayMomentos ? (
              <p className="py-10 text-center text-sm text-slate-400">Sin momentos evaluados para el servicio y periodo seleccionados</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={momentosServicio} margin={{ top: 22, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f2" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip labelFormatter={(_l, p) => p?.[0]?.payload?.titulo ?? _l} />
                  <Legend wrapperStyle={{ fontSize: 11, cursor: 'pointer' }} onClick={tglMomentos.onLegendClick} formatter={tglMomentos.legendFormatter} />
                  <Bar dataKey="cumple" name="Cumple" fill={BAR_CUMPLE} stackId="a" hide={tglMomentos.hidden.has('cumple')} isAnimationActive={false}>
                    <LabelList dataKey="pctCumple" content={SegmentLabel} />
                  </Bar>
                  <Bar dataKey="noCumple" name="No Cumple" fill={BAR_NO_CUMPLE} stackId="a" radius={[4,4,0,0]} hide={tglMomentos.hidden.has('noCumple')} isAnimationActive={false}>
                    <LabelList dataKey="pctNoCumple" content={SegmentLabel} />
                    <LabelList dataKey="pctCumple"   content={TotalPctLabel} position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Soporte de No Cumplimiento — solo aplica a registros NO CUMPLE */}
          <div className="card p-5">
            <h3 className="section-title mb-1">Soporte de No Cumplimiento</h3>
            <p className="text-xs text-slate-400 mb-3">
              Motivo registrado en las observaciones con resultado NO CUMPLE — {noCumple} registro(s)
            </p>
            {soporteData.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No hay motivos de no cumplimiento registrados para los filtros seleccionados
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="table-head-brand">
                      <th className="text-left px-3 py-2 font-semibold rounded-tl-lg">Motivo</th>
                      <th className="text-center px-3 py-2 font-semibold">Registros</th>
                      <th className="text-center px-3 py-2 font-semibold rounded-tr-lg">% del NO CUMPLE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {soporteData.map((s, i) => (
                      <tr key={i}
                        className={`border-b border-white/70 ${i % 2 === 1 ? 'bg-white/55' : ''} hover:bg-red-50 transition-colors cursor-pointer`}
                        onClick={() => abrirDetalle(`Soporte — ${s.name}`,
                          filtered.filter(r => r.soporte_no_cumplimiento === s.name))}>
                        <td className="px-3 py-2 font-medium text-slate-700">{s.name}</td>
                        <td className="px-3 py-2 text-center font-semibold text-red-600">{s.cantidad}</td>
                        <td className="px-3 py-2 text-center text-slate-500">{porcentaje(s.cantidad, noCumple)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Tablas independientes por servicio — 2 columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {tablasPorServicio.map(({ servicio, totalRegistros, perfiles }) => (
              <div key={servicio} className="card p-5">
                <div className="px-3.5 py-2.5 bg-brand-gradient border-l-4 border-accent-400 rounded-r-xl shadow-neu-sm mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white tracking-wide">{servicio}</h3>
                    <span className="text-xs text-white bg-brand-500 px-2 py-0.5 rounded-full">
                      {totalRegistros} registros
                    </span>
                  </div>
                </div>
                {perfiles.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2 text-center">Sin datos</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="table-head-brand">
                          <th className="text-left px-2.5 py-2 font-semibold rounded-tl-md">Perfil Colaborador</th>
                          <th className="text-center px-2 py-2 font-semibold">Registros</th>
                          <th className="text-center px-2 py-2 font-semibold text-emerald-300">CUMPLE</th>
                          <th className="text-center px-2 py-2 font-semibold text-red-300">NO CUMPLE</th>
                          <th className="text-center px-2 py-2 font-semibold text-blue-300">Prom. Suma</th>
                          <th className="text-center px-2 py-2 font-semibold rounded-tr-md">% Cumpl.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {perfiles.map((p, i) => (
                          <tr key={i} className={`border-b border-white/70 ${i % 2 === 1 ? 'bg-white/55' : ''} hover:bg-blue-50 transition-colors`}>
                            <td className="px-2.5 py-1.5 text-slate-700 font-medium">{p.perfil}</td>
                            <td className="px-2 py-1.5 text-center text-slate-500">{p.total}</td>
                            <td className="px-2 py-1.5 text-center font-semibold text-emerald-600">{p.cumple}</td>
                            <td className="px-2 py-1.5 text-center font-semibold text-red-500">{p.noCumple}</td>
                            <td className="px-2 py-1.5 text-center text-blue-600 font-semibold">{p.avgSuma}</td>
                            <td className="px-2 py-1.5 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded-full font-semibold
                                ${p.pct >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {p.pct}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Registros del periodo con el detalle de los 5 momentos */}
          <div className="card p-5" data-pdf-hide>
            <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
              <div>
                <h3 className="section-title mb-1">Registros del Periodo</h3>
                <p className="text-[10px] text-slate-500">
                  {total} registro(s) según los filtros · M1–M5 = los 5 momentos OMS (pasa el cursor para ver el nombre)
                </p>
              </div>
              <button onClick={exportarRegistros} disabled={exportando} className="btn-secondary text-xs gap-1.5">
                {exportando
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  : <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
                Exportar a Excel
              </button>
            </div>
            <DataTable
              data={filtered} columns={COLS_REGISTROS} pageSize={15}
              searchPlaceholder="Buscar por evaluado, servicio, perfil..."
              emptyMessage="Sin registros para los filtros seleccionados"
            />
          </div>
        </>
      )}

      <DetalleGraficaModal
        detalle={detalle}
        columnas={COLS_DETALLE}
        onClose={() => setDetalle(null)}
      />

    </div>
  )
}
