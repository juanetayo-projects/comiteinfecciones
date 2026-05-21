import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, ShieldAlert } from 'lucide-react'

const COLORS = { CUMPLE: '#10b981', 'NO CUMPLE': '#f87171' }
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

export default function AislamentoDashboard() {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('encuesta_aislamiento').select('*').order('fecha_registro', { ascending: false })
      .then(({ data: rows }) => { setData(rows ?? []); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="p-8 flex justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const total    = data.length
  const cumple   = data.filter(r => r.adherencia === 'CUMPLE').length
  const noCumple = total - cumple
  const pct      = total > 0 ? Math.round((cumple / total) * 100) : 0

  // PieChart data
  const pieData = [
    { name: 'CUMPLE',    value: cumple },
    { name: 'NO CUMPLE', value: noCumple },
  ].filter(d => d.value > 0)

  // Por servicio
  const byServicio = {}
  data.forEach(r => {
    const s = r.servicio || 'Sin servicio'
    if (!byServicio[s]) byServicio[s] = { name: s, CUMPLE: 0, 'NO CUMPLE': 0 }
    r.adherencia === 'CUMPLE' ? byServicio[s].CUMPLE++ : byServicio[s]['NO CUMPLE']++
  })
  const barServicio = Object.values(byServicio)

  // Por tipo aislamiento
  const byTipo = {}
  data.forEach(r => {
    const t = r.tipo_aislamiento || 'Sin tipo'
    if (!byTipo[t]) byTipo[t] = { name: t, CUMPLE: 0, 'NO CUMPLE': 0 }
    r.adherencia === 'CUMPLE' ? byTipo[t].CUMPLE++ : byTipo[t]['NO CUMPLE']++
  })
  const barTipo = Object.values(byTipo)

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

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Registros"  value={total}    color="indigo" />
        <KpiCard label="Adherencia Global" value={`${pct}%`} color={pct >= 80 ? 'emerald' : 'red'} sub={`${cumple} CUMPLE`} />
        <KpiCard label="CUMPLE"           value={cumple}   color="emerald" />
        <KpiCard label="NO CUMPLE"        value={noCumple} color="red" />
      </div>

      {total === 0 ? (
        <div className="card p-8 text-center text-slate-400">No hay registros disponibles</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Pie: adherencia global */}
          <div className="card p-5">
            <h3 className="section-title mb-4">Adherencia Global</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90}
                  dataKey="value" label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                  labelLine={false}>
                  {pieData.map((entry, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar: por servicio */}
          <div className="card p-5">
            <h3 className="section-title mb-4">Adherencia por Servicio</h3>
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

          {/* Bar: por tipo de aislamiento */}
          <div className="card p-5 lg:col-span-2">
            <h3 className="section-title mb-4">Adherencia por Tipo de Aislamiento</h3>
            <ResponsiveContainer width="100%" height={220}>
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
      )}
    </div>
  )
}
