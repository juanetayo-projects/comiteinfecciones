import { useEffect, useState, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, ShieldAlert, Filter, X } from 'lucide-react'
import DashboardPdfButton from '../../components/common/DashboardPdfButton'
import { filtrosResumen } from '../../lib/utils'

const PIE_COLORS = ['#059669', '#e11d48']
const BAR_CUMPLE    = '#059669'
const BAR_NO_CUMPLE = '#e11d48'

// Agrupa por campo y devuelve datos listos para BarChart, con % por segmento
function buildBarData(rows, key, fallback) {
  return Object.values(
    rows.reduce((acc, r) => {
      const k = r[key] || fallback
      if (!acc[k]) acc[k] = { name: k, CUMPLE: 0, 'NO CUMPLE': 0 }
      r.adherencia === 'CUMPLE' ? acc[k].CUMPLE++ : acc[k]['NO CUMPLE']++
      return acc
    }, {})
  ).map(d => {
    const total = d.CUMPLE + d['NO CUMPLE']
    return {
      ...d,
      total,
      pctCumple:   total > 0 ? Math.round((d.CUMPLE / total) * 100) : 0,
      pctNoCumple: total > 0 ? Math.round((d['NO CUMPLE'] / total) * 100) : 0,
    }
  }).sort((a, b) => b.total - a.total)
}

// Etiqueta de % dentro de cada segmento de la barra apilada
function SegmentLabel({ x, y, width, height, value }) {
  if (!value || height < 16) return null      // sin espacio suficiente → no dibujar
  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      fill="#ffffff"
      fontSize={11}
      fontWeight={700}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {value}%
    </text>
  )
}

// Etiqueta de adherencia total encima de la barra apilada
function TotalPctLabel({ x, y, width, value }) {
  if (value == null) return null
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      fill={value >= 80 ? '#047857' : '#be123c'}
      fontSize={11}
      fontWeight={800}
      textAnchor="middle"
    >
      {value}%
    </text>
  )
}

// Tooltip con conteos y porcentajes
function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-xl bg-white/95 shadow-neu px-3 py-2 text-xs border border-white">
      <p className="font-bold text-brand-900 mb-1">{label}</p>
      <p className="text-emerald-700 font-semibold">CUMPLE: {d.CUMPLE} ({d.pctCumple}%)</p>
      <p className="text-rose-700 font-semibold">NO CUMPLE: {d['NO CUMPLE']} ({d.pctNoCumple}%)</p>
      <p className="text-slate-500 mt-1">Total: {d.total} · Adherencia {d.pctCumple}%</p>
    </div>
  )
}

function KpiCard({ label, value, sub, color = 'slate' }) {
  const cls = {
    emerald: 'kpi-tile kpi-emerald',
    red:     'kpi-tile kpi-red',
    indigo:  'kpi-tile kpi-indigo',
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

function buildSummary(rows, key) {
  const map = {}
  rows.forEach(r => {
    const k = r[key] || 'Sin especificar'
    if (!map[k]) map[k] = { nombre: k, cumple: 0, noCumple: 0 }
    r.adherencia === 'CUMPLE' ? map[k].cumple++ : map[k].noCumple++
  })
  return Object.values(map).map(r => ({
    ...r,
    total: r.cumple + r.noCumple,
    pct: r.cumple + r.noCumple > 0
      ? Math.round((r.cumple / (r.cumple + r.noCumple)) * 100)
      : 0,
  })).sort((a, b) => b.total - a.total)
}

function SummaryTable({ rows, nameLabel }) {
  if (rows.length === 0) return <p className="text-xs text-slate-400 py-4 text-center">Sin datos</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="table-head-brand">
            <th className="text-left px-2.5 py-2 font-semibold rounded-tl-md">{nameLabel}</th>
            <th className="text-center px-2 py-2 font-semibold text-emerald-300">CUMPLE</th>
            <th className="text-center px-2 py-2 font-semibold text-red-300">NO CUMPLE</th>
            <th className="text-center px-2 py-2 font-semibold">Total</th>
            <th className="text-center px-2 py-2 font-semibold rounded-tr-md">%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={`border-b border-white/70 ${i % 2 === 1 ? 'bg-white/55' : ''} hover:bg-red-50 transition-colors`}>
              <td className="px-2.5 py-1.5 text-slate-700 font-medium">{r.nombre}</td>
              <td className="px-2 py-1.5 text-center font-semibold text-emerald-600">{r.cumple}</td>
              <td className="px-2 py-1.5 text-center font-semibold text-red-600">{r.noCumple}</td>
              <td className="px-2 py-1.5 text-center text-slate-500">{r.total}</td>
              <td className="px-2 py-1.5 text-center">
                <span className={`inline-block px-1.5 py-0.5 rounded-full font-semibold
                  ${r.pct >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {r.pct}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const INIT_FILTERS = { desde: '', hasta: '', servicio: '', profesional: '', tipo: '' }
// Etiquetas legibles de los filtros — se imprimen en el encabezado del PDF
const FILTER_LABELS = { desde:'Desde', hasta:'Hasta', servicio:'Servicio', profesional:'Profesional', tipo:'Tipo Aislamiento' }

export default function AislamentoDashboard() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(INIT_FILTERS)
  const pdfRef = useRef(null)

  useEffect(() => {
    supabase.from('encuesta_aislamiento').select('*').order('fecha_registro', { ascending: false })
      .then(({ data: rows }) => { setData(rows ?? []); setLoading(false) })
  }, [])

  // Unique filter options (from full dataset, not filtered)
  const servicios   = useMemo(() => [...new Set(data.map(r => r.servicio).filter(Boolean))].sort(), [data])
  const profesionales = useMemo(() => [...new Set(data.map(r => r.profesional).filter(Boolean))].sort(), [data])
  const tipos       = useMemo(() => [...new Set(data.map(r => r.tipo_aislamiento).filter(Boolean))].sort(), [data])

  const filtered = useMemo(() => {
    return data.filter(r => {
      if (filters.desde     && r.fecha_registro < filters.desde)          return false
      if (filters.hasta     && r.fecha_registro > filters.hasta)          return false
      if (filters.servicio  && r.servicio !== filters.servicio)            return false
      if (filters.profesional && r.profesional !== filters.profesional)   return false
      if (filters.tipo      && r.tipo_aislamiento !== filters.tipo)       return false
      return true
    })
  }, [data, filters])

  const hasFilters = Object.values(filters).some(Boolean)
  function clearFilters() { setFilters(INIT_FILTERS) }
  function setF(key, val) { setFilters(prev => ({ ...prev, [key]: val })) }

  if (loading) return (
    <div className="p-8 flex justify-center">
      <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const total    = filtered.length
  const cumple   = filtered.filter(r => r.adherencia === 'CUMPLE').length
  const noCumple = total - cumple
  const pct      = total > 0 ? Math.round((cumple / total) * 100) : 0

  const pieData = [
    { name: 'CUMPLE',    value: cumple },
    { name: 'NO CUMPLE', value: noCumple },
  ].filter(d => d.value > 0)

  const barServicio = buildBarData(filtered, 'servicio',         'Sin servicio')
  const barTipo     = buildBarData(filtered, 'tipo_aislamiento', 'Sin tipo')

  const tableServicio    = buildSummary(filtered, 'servicio')
  const tableProfesional = buildSummary(filtered, 'profesional')
  const tableTipo        = buildSummary(filtered, 'tipo_aislamiento')

  return (
    <div ref={pdfRef} className="p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/encuestas/aislamiento"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
          <ShieldAlert className="w-5 h-5 text-red-600" />
        </div>
        <div>
          <h1 className="page-title">Dashboard — Aislamiento Hospitalario</h1>
          <p className="page-subtitle">Análisis de adherencia a protocolos de aislamiento</p>
        </div>
        <div className="ml-auto" data-pdf-hide>
          <DashboardPdfButton
            targetRef={pdfRef}
            filename="dashboard_aislamiento"
            title="Dashboard — Aislamiento Hospitalario"
            subtitle="Análisis de adherencia a protocolos de aislamiento"
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
        <div className="filters-row" style={{ '--cols': 5 }}>
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
            <label>Profesional</label>
            <select className="input" value={filters.profesional} onChange={e => setF('profesional', e.target.value)}>
              <option value="">Todos</option>
              {profesionales.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label>Tipo Aislamiento</label>
            <select className="input" value={filters.tipo} onChange={e => setF('tipo', e.target.value)}>
              <option value="">Todos</option>
              {tipos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {hasFilters && (
          <p className="text-xs text-brand-600 mt-2">{total} de {data.length} registros mostrados</p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Registros"   value={total}         color="indigo" />
        <KpiCard label="Adherencia Global" value={`${pct}%`}     color={pct >= 80 ? 'emerald' : 'red'} sub={`${cumple} CUMPLE`} />
        <KpiCard label="CUMPLE"            value={cumple}        color="emerald" />
        <KpiCard label="NO CUMPLE"         value={noCumple}      color="red" />
      </div>

      {total === 0 ? (
        <div className="card p-8 text-center text-slate-400">No hay registros para los filtros seleccionados</div>
      ) : (
        <>
          {/* Gráficas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="section-title mb-2">Adherencia Global</h3>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={85}
                    dataKey="value" isAnimationActive={false}
                    label={({ name, value, percent }) => `${name} ${value} (${Math.round(percent * 100)}%)`}
                    labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} stroke="#ffffff" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} (${total > 0 ? Math.round((v / total) * 100) : 0}%)`, 'Registros']} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="section-title">Adherencia por Servicio</h3>
                <span className="text-[10px] text-slate-500">% dentro de cada barra · % de adherencia arriba</span>
              </div>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={barServicio} margin={{ top: 22, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f2" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(31,86,196,0.06)' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="CUMPLE" fill={BAR_CUMPLE} stackId="a" isAnimationActive={false}>
                    <LabelList dataKey="pctCumple" content={SegmentLabel} />
                  </Bar>
                  <Bar dataKey="NO CUMPLE" fill={BAR_NO_CUMPLE} stackId="a" isAnimationActive={false} radius={[4,4,0,0]}>
                    <LabelList dataKey="pctNoCumple" content={SegmentLabel} />
                    <LabelList dataKey="pctCumple"   content={TotalPctLabel} position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5 lg:col-span-2">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="section-title">Adherencia por Tipo de Aislamiento</h3>
                <span className="text-[10px] text-slate-500">% dentro de cada barra · % de adherencia arriba</span>
              </div>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={barTipo} margin={{ top: 22, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbe4f2" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(31,86,196,0.06)' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="CUMPLE" fill={BAR_CUMPLE} stackId="a" isAnimationActive={false}>
                    <LabelList dataKey="pctCumple" content={SegmentLabel} />
                  </Bar>
                  <Bar dataKey="NO CUMPLE" fill={BAR_NO_CUMPLE} stackId="a" isAnimationActive={false} radius={[4,4,0,0]}>
                    <LabelList dataKey="pctNoCumple" content={SegmentLabel} />
                    <LabelList dataKey="pctCumple"   content={TotalPctLabel} position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tablas resumen */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card p-5">
              <h3 className="section-title mb-2">Resumen por Servicio</h3>
              <SummaryTable rows={tableServicio} nameLabel="Servicio" />
            </div>
            <div className="card p-5">
              <h3 className="section-title mb-2">Resumen por Profesional</h3>
              <SummaryTable rows={tableProfesional} nameLabel="Profesional" />
            </div>
            <div className="card p-5">
              <h3 className="section-title mb-2">Resumen por Tipo Aislamiento</h3>
              <SummaryTable rows={tableTipo} nameLabel="Tipo" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
