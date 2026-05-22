import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, Microscope, Filter, X } from 'lucide-react'

const PIE_COLORS = ['#10b981', '#f87171']

function KpiCard({ label, value, sub, color = 'slate' }) {
  const cls = {
    emerald: 'bg-emerald-50 text-emerald-700',
    red:     'bg-red-50 text-red-700',
    indigo:  'bg-indigo-50 text-indigo-700',
    amber:   'bg-amber-50 text-amber-700',
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

function SH({ children }) {
  return (
    <div className="px-3 py-2 bg-[#1a4fa0] border-l-4 border-white/40 rounded-r-md mb-4">
      <h3 className="text-sm font-semibold text-white tracking-wide">{children}</h3>
    </div>
  )
}

function buildSummaryRLU(rows, key) {
  const map = {}
  rows.forEach(r => {
    const name = r[key] || 'Sin datos'
    if (!map[name]) map[name] = { nombre: name, cumple: 0, noCumple: 0, totalRLU: 0, count: 0 }
    if (r.rango === 'CUMPLE') map[name].cumple++
    else map[name].noCumple++
    map[name].totalRLU += Number(r.resultado) || 0
    map[name].count++
  })
  return Object.values(map).map(r => ({
    ...r,
    total: r.cumple + r.noCumple,
    pct: r.count > 0 ? Math.round((r.cumple / r.count) * 100) : 0,
    promRLU: r.count > 0 ? Math.round(r.totalRLU / r.count) : 0,
  })).sort((a, b) => b.total - a.total)
}

function SummaryTableRLU({ rows, title }) {
  if (!rows.length) return null
  return (
    <div className="card p-5">
      <SH>{title}</SH>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[#1a4fa0] text-white">
              <th className="text-left px-2.5 py-2 font-semibold rounded-tl-md">Nombre</th>
              <th className="text-center px-2 py-2 font-semibold text-emerald-300">CUMPLE</th>
              <th className="text-center px-2 py-2 font-semibold text-red-300">NO CUMPLE</th>
              <th className="text-center px-2 py-2 font-semibold">Total</th>
              <th className="text-center px-2 py-2 font-semibold text-amber-300">Prom. RLU</th>
              <th className="text-center px-2 py-2 font-semibold rounded-tr-md">%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50' : ''} hover:bg-amber-50 transition-colors`}>
                <td className="px-2.5 py-1.5 text-slate-700 font-medium">{r.nombre}</td>
                <td className="px-2 py-1.5 text-center font-semibold text-emerald-600">{r.cumple}</td>
                <td className="px-2 py-1.5 text-center font-semibold text-red-500">{r.noCumple}</td>
                <td className="px-2 py-1.5 text-center text-slate-500">{r.total}</td>
                <td className="px-2 py-1.5 text-center text-amber-600 font-semibold">{r.promRLU}</td>
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
    </div>
  )
}

const INIT_FILTERS = { desde: '', hasta: '', servicio: '', objeto: '' }

export default function LuminometriaDashboard() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(INIT_FILTERS)

  useEffect(() => {
    supabase.from('encuesta_luminometria').select('*').order('fecha_registro', { ascending: false })
      .then(({ data: rows }) => { setData(rows ?? []); setLoading(false) })
  }, [])

  const servicios = useMemo(() => [...new Set(data.map(r => r.servicio_evaluado).filter(Boolean))].sort(), [data])
  const objetos   = useMemo(() => [...new Set(data.map(r => r.objeto).filter(Boolean))].sort(), [data])

  const filtered = useMemo(() => {
    return data.filter(r => {
      if (filters.desde    && r.fecha_registro < filters.desde)          return false
      if (filters.hasta    && r.fecha_registro > filters.hasta)          return false
      if (filters.servicio && r.servicio_evaluado !== filters.servicio)  return false
      if (filters.objeto   && r.objeto !== filters.objeto)               return false
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
  const cumple   = filtered.filter(r => r.rango === 'CUMPLE').length
  const noCumple = total - cumple
  const pct      = total > 0 ? Math.round((cumple / total) * 100) : 0
  const avgRLU   = total > 0
    ? Math.round(filtered.reduce((s, r) => s + (Number(r.resultado) || 0), 0) / total)
    : 0

  const pieData = [
    { name: 'CUMPLE (<100 RLU)',    value: cumple },
    { name: 'NO CUMPLE (≥100 RLU)', value: noCumple },
  ].filter(d => d.value > 0)

  const barServicio = Object.values(
    filtered.reduce((acc, r) => {
      const s = r.servicio_evaluado || 'Sin servicio'
      if (!acc[s]) acc[s] = { name: s, CUMPLE: 0, 'NO CUMPLE': 0 }
      r.rango === 'CUMPLE' ? acc[s].CUMPLE++ : acc[s]['NO CUMPLE']++
      return acc
    }, {})
  )

  const barObjeto = Object.values(
    filtered.reduce((acc, r) => {
      const o = r.objeto || 'Sin objeto'
      if (!acc[o]) acc[o] = { name: o, CUMPLE: 0, 'NO CUMPLE': 0, totalRLU: 0, count: 0 }
      r.rango === 'CUMPLE' ? acc[o].CUMPLE++ : acc[o]['NO CUMPLE']++
      acc[o].totalRLU += Number(r.resultado) || 0
      acc[o].count++
      return acc
    }, {})
  ).map(o => ({ ...o, avgRLU: Math.round(o.totalRLU / o.count) }))

  const summaryByServicio = buildSummaryRLU(filtered, 'servicio_evaluado')
  const summaryByObjeto   = buildSummaryRLU(filtered, 'objeto')

  return (
    <div className="p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/encuestas/luminometria"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
          <Microscope className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h1 className="page-title">Dashboard — Luminometría</h1>
          <p className="page-subtitle">Control de limpieza ambiental por ATP (RLU)</p>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
            <label className="text-xs text-slate-500 mb-1 block">Objeto / Superficie</label>
            <select className="input text-sm" value={filters.objeto} onChange={e => setF('objeto', e.target.value)}>
              <option value="">Todos</option>
              {objetos.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        {hasFilters && (
          <p className="text-xs text-indigo-600 mt-2">{total} de {data.length} registros mostrados</p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Mediciones"  value={total}      color="indigo" />
        <KpiCard label="CUMPLE (<100 RLU)" value={`${pct}%`} color={pct >= 80 ? 'emerald' : 'red'} sub={`${cumple} superficies`} />
        <KpiCard label="Promedio RLU"      value={avgRLU}     color="amber" sub="valor medio" />
        <KpiCard label="NO CUMPLE"         value={noCumple}   color="red" sub="requieren limpieza" />
      </div>

      {total === 0 ? (
        <div className="card p-8 text-center text-slate-400">No hay registros para los filtros seleccionados</div>
      ) : (
        <>
          {/* Gráficas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="section-title mb-4">Resultado Global (RLU)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${Math.round(percent * 100)}%`}
                    labelLine>
                    {pieData.map((e, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="section-title mb-4">Cumplimiento por Servicio</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barServicio} margin={{ left: -10 }}>
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

            <div className="card p-5 lg:col-span-2">
              <h3 className="section-title mb-4">Promedio RLU por Objeto / Superficie</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barObjeto} margin={{ left: -5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="avgRLU" name="Promedio RLU"
                    fill="#f59e0b" radius={[3,3,0,0]}
                    label={{ position: 'top', fontSize: 10 }}
                  />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-slate-400 mt-2">Línea de corte: 100 RLU (CUMPLE si &lt; 100)</p>
            </div>
          </div>

          {/* Tablas resumen de indicadores — 2 columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SummaryTableRLU rows={summaryByServicio} title="Resumen por Servicio" />
            <SummaryTableRLU rows={summaryByObjeto}   title="Resumen por Objeto / Superficie" />
          </div>
        </>
      )}
    </div>
  )
}
