import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, ShieldAlert, Filter, X } from 'lucide-react'

const PIE_COLORS = ['#10b981', '#f87171']

function KpiCard({ label, value, sub, color = 'slate' }) {
  const cls = {
    emerald: 'bg-emerald-50 text-emerald-700',
    red:     'bg-red-50 text-red-700',
    indigo:  'bg-indigo-50 text-indigo-700',
    slate:   'bg-slate-50 text-slate-700',
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
          <tr className="bg-[#1a4fa0] text-white">
            <th className="text-left px-2.5 py-2 font-semibold rounded-tl-md">{nameLabel}</th>
            <th className="text-center px-2 py-2 font-semibold text-emerald-300">CUMPLE</th>
            <th className="text-center px-2 py-2 font-semibold text-red-300">NO CUMPLE</th>
            <th className="text-center px-2 py-2 font-semibold">Total</th>
            <th className="text-center px-2 py-2 font-semibold rounded-tr-md">%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50' : ''} hover:bg-red-50 transition-colors`}>
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

export default function AislamentoDashboard() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(INIT_FILTERS)

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
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
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

  const barServicio = Object.values(
    filtered.reduce((acc, r) => {
      const s = r.servicio || 'Sin servicio'
      if (!acc[s]) acc[s] = { name: s, CUMPLE: 0, 'NO CUMPLE': 0 }
      r.adherencia === 'CUMPLE' ? acc[s].CUMPLE++ : acc[s]['NO CUMPLE']++
      return acc
    }, {})
  )

  const barTipo = Object.values(
    filtered.reduce((acc, r) => {
      const t = r.tipo_aislamiento || 'Sin tipo'
      if (!acc[t]) acc[t] = { name: t, CUMPLE: 0, 'NO CUMPLE': 0 }
      r.adherencia === 'CUMPLE' ? acc[t].CUMPLE++ : acc[t]['NO CUMPLE']++
      return acc
    }, {})
  )

  const tableServicio    = buildSummary(filtered, 'servicio')
  const tableProfesional = buildSummary(filtered, 'profesional')
  const tableTipo        = buildSummary(filtered, 'tipo_aislamiento')

  return (
    <div className="p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
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
      </div>

      {/* Filtros */}
      <div className="card p-4">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Desde</label>
            <input type="date" className="input text-sm"
              value={filters.desde} onChange={e => setF('desde', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Hasta</label>
            <input type="date" className="input text-sm"
              value={filters.hasta} onChange={e => setF('hasta', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Servicio</label>
            <select className="input text-sm" value={filters.servicio} onChange={e => setF('servicio', e.target.value)}>
              <option value="">Todos</option>
              {servicios.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Profesional</label>
            <select className="input text-sm" value={filters.profesional} onChange={e => setF('profesional', e.target.value)}>
              <option value="">Todos</option>
              {profesionales.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Tipo Aislamiento</label>
            <select className="input text-sm" value={filters.tipo} onChange={e => setF('tipo', e.target.value)}>
              <option value="">Todos</option>
              {tipos.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {hasFilters && (
          <p className="text-xs text-indigo-600 mt-2">{total} de {data.length} registros mostrados</p>
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
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={90}
                    dataKey="value" label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                    labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="section-title mb-2">Adherencia por Servicio</h3>
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={barServicio} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="CUMPLE"    fill="#10b981" stackId="a" />
                  <Bar dataKey="NO CUMPLE" fill="#f87171" stackId="a" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5 lg:col-span-2">
              <h3 className="section-title mb-2">Adherencia por Tipo de Aislamiento</h3>
              <ResponsiveContainer width="100%" height={155}>
                <BarChart data={barTipo} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="CUMPLE"    fill="#10b981" stackId="a" />
                  <Bar dataKey="NO CUMPLE" fill="#f87171" stackId="a" radius={[3,3,0,0]} />
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
