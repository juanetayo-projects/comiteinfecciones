import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, Syringe, Filter, X, BarChart3, TrendingUp, TrendingDown } from 'lucide-react'

const AVP_KEYS   = ['criterio_1_rotulo','criterio_2_fijacion','criterio_3_mantenimiento','criterio_4_pertinencia','criterio_5_educacion']
const AVP_LABELS = ['Rotulación','Fijación','Mantenimiento','Pertinencia','Educación']

function porcentaje(c, t) { return t > 0 ? Math.round((c / t) * 100) : 0 }

function SH({ children }) {
  return (
    <div className="px-3 py-2 bg-[#1a4fa0] border-l-4 border-white/40 rounded-r-md mb-4">
      <h3 className="text-sm font-semibold text-white tracking-wide">{children}</h3>
    </div>
  )
}

function KpiCard({ label, value, sub, color = 'indigo', icon: Icon }) {
  const cls = {
    indigo:  'bg-indigo-50  text-indigo-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    red:     'bg-red-50     text-red-700',
    amber:   'bg-amber-50   text-amber-700',
    slate:   'bg-slate-50   text-slate-700',
  }[color] ?? 'bg-slate-50 text-slate-700'
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

const INIT_FILTERS = { desde: '', hasta: '', ubicacion: '' }

export default function AccesoVenasoDashboard() {
  const [raw,     setRaw]     = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(INIT_FILTERS)

  useEffect(() => {
    supabase.from('encuesta_acceso_venoso').select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setRaw(data ?? []); setLoading(false) })
  }, [])

  const ubicaciones = useMemo(() => [...new Set(raw.map(r => r.ubicacion_cama).filter(Boolean))].sort(), [raw])

  const rows = useMemo(() => raw.filter(r => {
    if (filters.desde    && r.fecha_registro < filters.desde)       return false
    if (filters.hasta    && r.fecha_registro > filters.hasta)       return false
    if (filters.ubicacion && r.ubicacion_cama !== filters.ubicacion) return false
    return true
  }), [raw, filters])

  const hasFilters = Object.values(filters).some(Boolean)
  function setF(k, v) { setFilters(p => ({ ...p, [k]: v })) }

  // Tendencia por semana del mes — ANTES del return condicional (Rules of Hooks)
  const semanaData = useMemo(() => {
    const map = {}
    rows.forEach(r => {
      if (!r.fecha_registro) return
      const semana = Math.ceil(new Date(r.fecha_registro + 'T12:00:00').getDate() / 7)
      const key = `S${semana}`
      if (!map[key]) map[key] = { semana: key, registros: 0, cumpleCrit: 0, totalCrit: 0 }
      map[key].registros++
      AVP_KEYS.forEach(k => {
        map[key].totalCrit++
        if (r[k] === true) map[key].cumpleCrit++
      })
    })
    return Object.values(map).map(s => ({
      ...s,
      pct: porcentaje(s.cumpleCrit, s.totalCrit),
    })).sort((a, b) => a.semana.localeCompare(b.semana))
  }, [rows])

  // Resumen por ubicación — ANTES del return condicional (Rules of Hooks)
  const summaryUb = useMemo(() => {
    const map = {}
    rows.forEach(r => {
      const ub = r.ubicacion_cama || 'Sin ubicación'
      if (!map[ub]) map[ub] = { ub, regs: 0, cumple: 0, total: 0 }
      map[ub].regs++
      AVP_KEYS.forEach(k => {
        map[ub].total++
        if (r[k] === true) map[ub].cumple++
      })
    })
    return Object.values(map).map(r => ({ ...r, pct: porcentaje(r.cumple, r.total) }))
      .sort((a, b) => b.regs - a.regs)
  }, [rows])

  if (loading) return (
    <div className="p-8 flex justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // KPIs
  const totalCrit = rows.length * AVP_KEYS.length
  const cumpleCrit = rows.reduce((acc, r) => acc + AVP_KEYS.filter(k => r[k] === true).length, 0)
  const pctAdh = porcentaje(cumpleCrit, totalCrit)
  const totalCumple5 = rows.filter(r => AVP_KEYS.every(k => r[k] === true)).length
  const pctCompleto  = porcentaje(totalCumple5, rows.length)

  // Datos de criterios para gráfica
  const criteriosData = AVP_KEYS.map((k, i) => {
    const c = rows.filter(r => r[k] === true).length
    return { name: AVP_LABELS[i], cumple: c, noCumple: rows.length - c, pct: porcentaje(c, rows.length) }
  })

  return (
    <div className="p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/encuestas/acceso-venoso"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
          <Syringe className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="page-title">Dashboard — Acceso Venoso Periférico</h1>
          <p className="page-subtitle">Adherencia a criterios de calidad del catéter AVP · {raw.length} registros totales</p>
        </div>
        <Link to="/encuestas/acceso-venoso/nuevo" className="ml-auto btn-primary text-xs gap-1.5">
          <BarChart3 className="w-3.5 h-3.5" /> Nuevo Registro
        </Link>
      </div>

      {/* Filtros */}
      <div className="card p-4">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Desde</label>
            <input type="date" className="input text-sm" value={filters.desde} onChange={e => setF('desde', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Hasta</label>
            <input type="date" className="input text-sm" value={filters.hasta} onChange={e => setF('hasta', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Ubicación / Cama</label>
            <select className="input text-sm" value={filters.ubicacion} onChange={e => setF('ubicacion', e.target.value)}>
              <option value="">Todas</option>
              {ubicaciones.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        {hasFilters && <p className="text-xs text-indigo-600 mt-2">{rows.length} de {raw.length} registros</p>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Registros"       value={rows.length} sub="AVP evaluados" color="indigo" icon={Syringe} />
        <KpiCard label="% Adherencia Global"   value={`${pctAdh}%`}
          sub="Criterios CUMPLE ÷ total criterios"
          color={pctAdh >= 80 ? 'emerald' : 'red'}
          icon={pctAdh >= 80 ? TrendingUp : TrendingDown} />
        <KpiCard label="Paquete Completo (5/5)" value={`${pctCompleto}%`}
          sub={`${totalCumple5} registros con todos los criterios`}
          color={pctCompleto >= 80 ? 'emerald' : 'amber'} />
        <KpiCard label="Criterios Evaluados"   value={totalCrit}
          sub={`${cumpleCrit} cumplen · ${totalCrit - cumpleCrit} no cumplen`} color="slate" />
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">No hay registros para los filtros seleccionados</div>
      ) : (
        <>
          {/* Gráfica criterios + tabla en 2 columnas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Criterios bar chart */}
            <div className="card p-5">
              <h3 className="section-title mb-1">Criterios de Adherencia</h3>
              <p className="text-xs text-slate-400 mb-3">% cumplimiento por criterio — {rows.length} registros</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={criteriosData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip formatter={v => `${v}`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="cumple"   name="Cumple"    fill="#10b981" stackId="a" />
                  <Bar dataKey="noCumple" name="No Cumple" fill="#f87171" stackId="a" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tabla resumen por ubicación */}
            <div className="card p-5">
              <SH>Resumen por Ubicación / Cama</SH>
              <p className="text-xs text-slate-400 mb-3">
                % Adherencia = criterios CUMPLE ÷ (registros × {AVP_KEYS.length} criterios)
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#1a4fa0] text-white">
                      <th className="text-left px-3 py-2 font-semibold rounded-tl-lg">Ubicación / Cama</th>
                      <th className="text-center px-3 py-2 font-semibold">Registros</th>
                      <th className="text-center px-3 py-2 font-semibold text-emerald-300">Criterios ✓</th>
                      <th className="text-center px-3 py-2 font-semibold rounded-tr-lg">% Adher.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryUb.map((r, i) => (
                      <tr key={i} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50' : ''} hover:bg-indigo-50 transition-colors`}>
                        <td className="px-3 py-2 font-medium text-slate-700">{r.ub}</td>
                        <td className="px-3 py-2 text-center text-slate-500">{r.regs}</td>
                        <td className="px-3 py-2 text-center font-semibold text-emerald-600">{r.cumple} / {r.total}</td>
                        <td className="px-3 py-2 text-center">
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
          </div>

          {/* Tendencia semanal — ancho completo */}
          {semanaData.length > 1 && (
            <div className="card p-5">
              <h3 className="section-title mb-1">Tendencia Semanal</h3>
              <p className="text-xs text-slate-400 mb-3">% adherencia por semana del mes</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={semanaData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip formatter={v => `${v}%`} />
                  <Line type="monotone" dataKey="pct" name="% Adherencia"
                    stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }}
                    label={{ position: 'top', fontSize: 10, formatter: v => `${v}%` }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  )
}
