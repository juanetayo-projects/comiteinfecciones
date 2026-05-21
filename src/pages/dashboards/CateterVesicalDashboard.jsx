import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, Droplets, Filter, X, BarChart3, TrendingUp, TrendingDown } from 'lucide-react'

const CV_KEYS   = ['criterio_1_fijacion','criterio_2_posicion_bolsa','criterio_3_rotulacion','criterio_4_indicacion','criterio_5_flujo_continuo','criterio_6_lista_chequeo_sonda']
const CV_LABELS = ['Fijación','Posic. Bolsa','Rotulación','Indicación','Flujo','Lista Chequeo']

function porcentaje(c, t) { return t > 0 ? Math.round((c / t) * 100) : 0 }

function SH({ children }) {
  return (
    <div className="px-3 py-2 bg-slate-700 border-l-4 border-indigo-400 rounded-r-md mb-4">
      <h3 className="text-sm font-semibold text-white tracking-wide">{children}</h3>
    </div>
  )
}

function KpiCard({ label, value, sub, color = 'cyan', icon: Icon }) {
  const cls = {
    cyan:    'bg-cyan-50    text-cyan-700',
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

export default function CateterVesicalDashboard() {
  const [raw,     setRaw]     = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(INIT_FILTERS)

  useEffect(() => {
    supabase.from('encuesta_cateter_vesical').select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setRaw(data ?? []); setLoading(false) })
  }, [])

  const ubicaciones = useMemo(() => [...new Set(raw.map(r => r.ubicacion_cama).filter(Boolean))].sort(), [raw])

  const rows = useMemo(() => raw.filter(r => {
    if (filters.desde    && r.fecha_registro < filters.desde)        return false
    if (filters.hasta    && r.fecha_registro > filters.hasta)        return false
    if (filters.ubicacion && r.ubicacion_cama !== filters.ubicacion) return false
    return true
  }), [raw, filters])

  const hasFilters = Object.values(filters).some(Boolean)
  function setF(k, v) { setFilters(p => ({ ...p, [k]: v })) }

  if (loading) return (
    <div className="p-8 flex justify-center">
      <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // KPIs
  const totalCrit  = rows.length * CV_KEYS.length
  const cumpleCrit = rows.reduce((acc, r) => acc + CV_KEYS.filter(k => r[k] === true).length, 0)
  const pctAdh     = porcentaje(cumpleCrit, totalCrit)
  const totalIrrig = rows.filter(r => r.tiene_irrigacion === true).length
  const pctCompleto = porcentaje(rows.filter(r => CV_KEYS.every(k => r[k] === true)).length, rows.length)

  // Datos de criterios para gráfica
  const criteriosData = CV_KEYS.map((k, i) => {
    const c = rows.filter(r => r[k] === true).length
    return { name: CV_LABELS[i], cumple: c, noCumple: rows.length - c }
  })

  // Tendencia por semana del mes
  const semanaData = useMemo(() => {
    const map = {}
    rows.forEach(r => {
      if (!r.fecha_registro) return
      const semana = Math.ceil(new Date(r.fecha_registro + 'T12:00:00').getDate() / 7)
      const key = `S${semana}`
      if (!map[key]) map[key] = { semana: key, registros: 0, cumpleCrit: 0, totalCrit: 0 }
      map[key].registros++
      CV_KEYS.forEach(k => {
        map[key].totalCrit++
        if (r[k] === true) map[key].cumpleCrit++
      })
    })
    return Object.values(map).map(s => ({
      ...s,
      pct: porcentaje(s.cumpleCrit, s.totalCrit),
    })).sort((a, b) => a.semana.localeCompare(b.semana))
  }, [rows])

  // Resumen por ubicación
  const summaryUb = useMemo(() => {
    const map = {}
    rows.forEach(r => {
      const ub = r.ubicacion_cama || 'Sin ubicación'
      if (!map[ub]) map[ub] = { ub, regs: 0, cumple: 0, total: 0 }
      map[ub].regs++
      CV_KEYS.forEach(k => {
        map[ub].total++
        if (r[k] === true) map[ub].cumple++
      })
    })
    return Object.values(map).map(r => ({ ...r, pct: porcentaje(r.cumple, r.total) }))
      .sort((a, b) => b.regs - a.regs)
  }, [rows])

  return (
    <div className="p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/encuestas/cateter-vesical"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-9 h-9 rounded-xl bg-cyan-100 flex items-center justify-center">
          <Droplets className="w-5 h-5 text-cyan-600" />
        </div>
        <div>
          <h1 className="page-title">Dashboard — Catéter Vesical</h1>
          <p className="page-subtitle">Adherencia a criterios de calidad de sondas vesicales · {raw.length} registros totales</p>
        </div>
        <Link to="/encuestas/cateter-vesical/nuevo" className="ml-auto btn-primary text-xs gap-1.5">
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
        {hasFilters && <p className="text-xs text-cyan-600 mt-2">{rows.length} de {raw.length} registros</p>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Registros"       value={rows.length} sub="Sondas evaluadas" color="cyan" icon={Droplets} />
        <KpiCard label="% Adherencia Global"   value={`${pctAdh}%`}
          sub="Criterios CUMPLE ÷ total criterios"
          color={pctAdh >= 80 ? 'emerald' : 'red'}
          icon={pctAdh >= 80 ? TrendingUp : TrendingDown} />
        <KpiCard label="Paquete Completo (6/6)" value={`${pctCompleto}%`}
          sub="Registros con todos los criterios"
          color={pctCompleto >= 80 ? 'emerald' : 'amber'} />
        <KpiCard label="Con Irrigación"        value={totalIrrig}
          sub={`${rows.length - totalIrrig} sin irrigación`} color="slate" />
      </div>

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">No hay registros para los filtros seleccionados</div>
      ) : (
        <>
          {/* Gráficas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="section-title mb-1">Criterios de Adherencia</h3>
              <p className="text-xs text-slate-400 mb-3">Registros con cumplimiento por criterio — {rows.length} evaluaciones</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={criteriosData} margin={{ left: -10 }}>
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
                      stroke="#06b6d4" strokeWidth={2} dot={{ r: 4 }}
                      label={{ position: 'top', fontSize: 10, formatter: v => `${v}%` }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Tabla resumen por ubicación */}
          <div className="card p-5">
            <SH>Resumen por Ubicación / Cama</SH>
            <p className="text-xs text-slate-400 mb-3">
              % Adherencia = criterios CUMPLE ÷ (registros × {CV_KEYS.length} criterios por registro)
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="text-left px-3 py-2.5 font-semibold rounded-tl-lg text-xs">Ubicación / Cama</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-xs">Registros</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-xs text-cyan-300">Criterios Cumplidos</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-xs rounded-tr-lg">% Adherencia</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryUb.map((r, i) => (
                    <tr key={i} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50' : ''} hover:bg-cyan-50 transition-colors`}>
                      <td className="px-3 py-2.5 font-medium text-slate-700">{r.ub}</td>
                      <td className="px-3 py-2.5 text-center text-slate-500">{r.regs}</td>
                      <td className="px-3 py-2.5 text-center font-semibold text-cyan-600">{r.cumple} / {r.total}</td>
                      <td className="px-3 py-2.5 text-center">
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
        </>
      )}
    </div>
  )
}
