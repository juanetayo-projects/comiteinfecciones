import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, Hand, Filter, X } from 'lucide-react'

const PIE_COLORS = ['#10b981', '#f87171']

function KpiCard({ label, value, sub, color = 'slate' }) {
  const cls = {
    emerald: 'bg-emerald-50 text-emerald-700',
    red:     'bg-red-50 text-red-700',
    indigo:  'bg-indigo-50 text-indigo-700',
    blue:    'bg-blue-50 text-blue-700',
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

const INIT_FILTERS = { desde: '', hasta: '', servicio: '', perfil: '' }

export default function HigieneDashboard() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(INIT_FILTERS)

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
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
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

  const barServicio = Object.values(
    filtered.reduce((acc, r) => {
      const s = r.servicio_evaluado || 'Sin servicio'
      if (!acc[s]) acc[s] = { name: s, CUMPLE: 0, 'NO CUMPLE': 0 }
      r.resultado_cumplimiento === 'CUMPLE' ? acc[s].CUMPLE++ : acc[s]['NO CUMPLE']++
      return acc
    }, {})
  )

  const barPerfil = Object.values(
    filtered.reduce((acc, r) => {
      const p = r.perfil_colaborador || 'Sin perfil'
      if (!acc[p]) acc[p] = { name: p, CUMPLE: 0, 'NO CUMPLE': 0 }
      r.resultado_cumplimiento === 'CUMPLE' ? acc[p].CUMPLE++ : acc[p]['NO CUMPLE']++
      return acc
    }, {})
  )

  const sumDist = [0,1,2,3,4,5].map(v => ({
    name: `${v}/5`,
    cantidad: filtered.filter(r => r.sumatoria_cumplimiento === v).length,
  }))

  return (
    <div className="p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
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
            <label className="text-xs text-slate-500 mb-1 block">Perfil Colaborador</label>
            <select className="input text-sm" value={filters.perfil} onChange={e => setF('perfil', e.target.value)}>
              <option value="">Todos</option>
              {perfiles.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        {hasFilters && (
          <p className="text-xs text-indigo-600 mt-2">{total} de {data.length} registros mostrados</p>
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
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                    labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="section-title mb-4">Distribución Sumatoria (0–5 momentos)</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sumDist} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="cantidad" fill="#3b82f6" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="section-title mb-4">Cumplimiento por Servicio</h3>
              <ResponsiveContainer width="100%" height={220}>
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

            <div className="card p-5">
              <h3 className="section-title mb-4">Cumplimiento por Perfil</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barPerfil} margin={{ left: -10 }}>
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
          </div>

          {/* Tablas independientes por servicio — 2 columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {tablasPorServicio.map(({ servicio, totalRegistros, perfiles }) => (
              <div key={servicio} className="card p-5">
                <div className="px-3 py-2 bg-slate-700 border-l-4 border-indigo-400 rounded-r-md mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white tracking-wide">{servicio}</h3>
                    <span className="text-xs text-white bg-indigo-500 px-2 py-0.5 rounded-full">
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
                        <tr className="bg-slate-800 text-white">
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
                          <tr key={i} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50' : ''} hover:bg-blue-50 transition-colors`}>
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
        </>
      )}
    </div>
  )
}
