import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, Stethoscope, Filter, X } from 'lucide-react'

const PIE_COLORS = ['#10b981', '#f87171', '#94a3b8', '#fbbf24']

function KpiCard({ label, value, sub, color = 'slate' }) {
  const cls = {
    emerald: 'bg-emerald-50 text-emerald-700',
    red:     'bg-red-50 text-red-700',
    indigo:  'bg-indigo-50 text-indigo-700',
    purple:  'bg-purple-50 text-purple-700',
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
    <div className="px-3 py-2 bg-slate-700 border-l-4 border-indigo-400 rounded-r-md mb-4">
      <h3 className="text-sm font-semibold text-white tracking-wide">{children}</h3>
    </div>
  )
}

// Construye resumen de profilaxis agrupado por columna `key`
function buildSummaryProfilaxis(rows, key) {
  const map = {}
  rows.forEach(r => {
    const name = r[key] || 'Sin datos'
    if (!map[name]) map[name] = { nombre: name, cumple: 0, noCumple: 0, noAplica: 0 }
    const v = r.cumplimiento_profilaxis || 'SIN DATO'
    if      (v === 'CUMPLE')    map[name].cumple++
    else if (v === 'NO APLICA') map[name].noAplica++
    else                         map[name].noCumple++
  })
  return Object.values(map).map(r => ({
    ...r,
    total: r.cumple + r.noCumple + r.noAplica,
    pct: (r.cumple + r.noCumple + r.noAplica) > 0
      ? Math.round((r.cumple / (r.cumple + r.noCumple + r.noAplica)) * 100)
      : 0,
  })).sort((a, b) => b.total - a.total)
}

function SummaryTableRonda({ rows, title }) {
  if (!rows.length) return null
  return (
    <div className="card p-5">
      <SH>{title}</SH>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left pb-2 pr-4 font-medium text-slate-600">Nombre</th>
              <th className="text-center pb-2 px-2 font-medium text-emerald-600">CUMPLE</th>
              <th className="text-center pb-2 px-2 font-medium text-red-600">NO CUMPLE</th>
              <th className="text-center pb-2 px-2 font-medium text-slate-400">NO APLICA</th>
              <th className="text-center pb-2 px-2 font-medium text-slate-600">Total</th>
              <th className="text-center pb-2 font-medium text-slate-600">% Cumpl.</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="py-2 pr-4 text-slate-700 font-medium">{r.nombre}</td>
                <td className="py-2 px-2 text-center font-semibold text-emerald-600">{r.cumple}</td>
                <td className="py-2 px-2 text-center font-semibold text-red-500">{r.noCumple}</td>
                <td className="py-2 px-2 text-center text-slate-400">{r.noAplica}</td>
                <td className="py-2 px-2 text-center text-slate-500">{r.total}</td>
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

const CRITERIOS_KEY = [
  { key: 'jabones_toallas',           label: 'Jabones/Toallas' },
  { key: 'guardianes_fijos_rotulados', label: 'Guardianes' },
  { key: 'puertas_cerradas',          label: 'Puertas Cerradas' },
  { key: 'lista_chequeo_cx_segura',   label: 'Lista Cx. Segura' },
  { key: 'coloca_antibiotico_antes',  label: 'Antibiótico Previo' },
  { key: 'cumplimiento_profilaxis',   label: 'Profilaxis' },
  { key: 'lavado_manos_quirurgico',   label: 'Lavado Quirúrgico' },
  { key: 'epp_completo',              label: 'EPP Completo' },
]

const INIT_FILTERS = { desde: '', hasta: '', servicio: '', quirofano: '', especialidad: '', profesional: '' }

export default function RondaDashboard() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(INIT_FILTERS)

  useEffect(() => {
    supabase.from('encuesta_ronda_cirugia').select('*').order('fecha_registro', { ascending: false })
      .then(({ data: rows }) => { setData(rows ?? []); setLoading(false) })
  }, [])

  const servicios     = useMemo(() => [...new Set(data.map(r => r.servicio).filter(Boolean))].sort(), [data])
  const quirofanos    = useMemo(() => [...new Set(data.map(r => r.quirofano).filter(Boolean))].sort(), [data])
  const especialidades = useMemo(() => [...new Set(data.map(r => r.especialidad).filter(Boolean))].sort(), [data])
  const profesionales  = useMemo(() => [...new Set(data.map(r => r.profesional).filter(Boolean))].sort(), [data])

  const filtered = useMemo(() => {
    return data.filter(r => {
      if (filters.desde        && r.fecha_registro < filters.desde)         return false
      if (filters.hasta        && r.fecha_registro > filters.hasta)         return false
      if (filters.servicio     && r.servicio !== filters.servicio)           return false
      if (filters.quirofano    && r.quirofano !== filters.quirofano)         return false
      if (filters.especialidad && r.especialidad !== filters.especialidad)   return false
      if (filters.profesional  && r.profesional !== filters.profesional)     return false
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

  const total      = filtered.length
  const profilaxis = filtered.filter(r => r.cumplimiento_profilaxis === 'CUMPLE').length
  const pctPro     = total > 0 ? Math.round((profilaxis / total) * 100) : 0

  const byQ = {}
  filtered.forEach(r => {
    const q = `Qx ${r.quirofano || '?'}`
    if (!byQ[q]) byQ[q] = { name: q, registros: 0 }
    byQ[q].registros++
  })
  const barQ = Object.values(byQ).sort((a, b) => a.name.localeCompare(b.name))

  const criteriosData = CRITERIOS_KEY.map(c => {
    const withData = filtered.filter(r => r[c.key])
    return {
      name:        c.label,
      CUMPLE:      withData.filter(r => r[c.key] === 'CUMPLE').length,
      'NO CUMPLE': withData.filter(r => r[c.key] === 'NO CUMPLE').length,
      'NO APLICA': withData.filter(r => r[c.key] === 'NO APLICA').length,
    }
  })

  const piePro = ['CUMPLE','NO CUMPLE','NO APLICA','SIN DATO'].map(v => ({
    name: v,
    value: filtered.filter(r => (r.cumplimiento_profilaxis || 'SIN DATO') === v).length,
  })).filter(d => d.value > 0)

  const summaryByServicio     = buildSummaryProfilaxis(filtered, 'servicio')
  const summaryByQuirofano    = buildSummaryProfilaxis(filtered, 'quirofano')
  const summaryByEspecialidad = buildSummaryProfilaxis(filtered, 'especialidad')
  const summaryByProfesional  = buildSummaryProfilaxis(filtered, 'profesional')

  return (
    <div className="p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/encuestas/ronda-cirugia"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
          <Stethoscope className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h1 className="page-title">Dashboard — Ronda de Cirugía</h1>
          <p className="page-subtitle">Control de profilaxis antibiótica y criterios quirúrgicos</p>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
            <label className="text-xs text-slate-500 mb-1 block">Quirófano</label>
            <select className="input text-sm" value={filters.quirofano} onChange={e => setF('quirofano', e.target.value)}>
              <option value="">Todos</option>
              {quirofanos.map(q => <option key={q} value={q}>Qx {q}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Especialidad</label>
            <select className="input text-sm" value={filters.especialidad} onChange={e => setF('especialidad', e.target.value)}>
              <option value="">Todas</option>
              {especialidades.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Profesional</label>
            <select className="input text-sm" value={filters.profesional} onChange={e => setF('profesional', e.target.value)}>
              <option value="">Todos</option>
              {profesionales.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        {hasFilters && (
          <p className="text-xs text-indigo-600 mt-2">{total} de {data.length} registros mostrados</p>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Rondas"        value={total}        color="indigo" />
        <KpiCard label="Profilaxis CUMPLE"   value={`${pctPro}%`} color={pctPro >= 80 ? 'emerald' : 'red'} sub={`${profilaxis} de ${total}`} />
        <KpiCard label="Quirófanos activos"  value={Object.keys(byQ).length} color="purple" />
        <KpiCard label="Sin profilaxis data" value={filtered.filter(r => !r.cumplimiento_profilaxis).length} color="slate" />
      </div>

      {total === 0 ? (
        <div className="card p-8 text-center text-slate-400">No hay registros para los filtros seleccionados</div>
      ) : (
        <>
          {/* Gráficas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="section-title mb-4">Profilaxis Antibiótica</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={piePro} cx="50%" cy="50%" outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                    labelLine={false}>
                    {piePro.map((e, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5">
              <h3 className="section-title mb-4">Registros por Quirófano</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barQ} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="registros" fill="#a855f7" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card p-5 lg:col-span-2">
              <h3 className="section-title mb-4">Cumplimiento por Criterio</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={criteriosData} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="CUMPLE"    fill="#10b981" stackId="a" />
                  <Bar dataKey="NO CUMPLE" fill="#f87171" stackId="a" />
                  <Bar dataKey="NO APLICA" fill="#94a3b8" stackId="a" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tablas resumen de indicadores */}
          <SummaryTableRonda rows={summaryByServicio}     title="Resumen por Servicio" />
          <SummaryTableRonda rows={summaryByQuirofano}    title="Resumen por Quirófano" />
          <SummaryTableRonda rows={summaryByEspecialidad} title="Resumen por Especialidad" />
          <SummaryTableRonda rows={summaryByProfesional}  title="Resumen por Profesional" />
        </>
      )}
    </div>
  )
}
