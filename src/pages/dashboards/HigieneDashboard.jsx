import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, Hand } from 'lucide-react'

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

export default function HigieneDashboard() {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('encuesta_higiene_manos').select('*').order('fecha_evaluacion', { ascending: false })
      .then(({ data: rows }) => { setData(rows ?? []); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="p-8 flex justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const total    = data.length
  const cumple   = data.filter(r => r.resultado_cumplimiento === 'CUMPLE').length
  const noCumple = total - cumple
  const pct      = total > 0 ? Math.round((cumple / total) * 100) : 0

  const avgSumatoria = total > 0
    ? (data.reduce((s, r) => s + (r.sumatoria_cumplimiento ?? 0), 0) / total).toFixed(1)
    : 0

  // PieChart
  const pieData = [
    { name: 'CUMPLE',    value: cumple },
    { name: 'NO CUMPLE', value: noCumple },
  ].filter(d => d.value > 0)

  // Por servicio
  const byServicio = {}
  data.forEach(r => {
    const s = r.servicio_evaluado || 'Sin servicio'
    if (!byServicio[s]) byServicio[s] = { name: s, CUMPLE: 0, 'NO CUMPLE': 0 }
    r.resultado_cumplimiento === 'CUMPLE' ? byServicio[s].CUMPLE++ : byServicio[s]['NO CUMPLE']++
  })
  const barServicio = Object.values(byServicio)

  // Por perfil colaborador
  const byPerfil = {}
  data.forEach(r => {
    const p = r.perfil_colaborador || 'Sin perfil'
    if (!byPerfil[p]) byPerfil[p] = { name: p, CUMPLE: 0, 'NO CUMPLE': 0 }
    r.resultado_cumplimiento === 'CUMPLE' ? byPerfil[p].CUMPLE++ : byPerfil[p]['NO CUMPLE']++
  })
  const barPerfil = Object.values(byPerfil)

  // Distribución sumatoria 0-5
  const sumDist = [0,1,2,3,4,5].map(v => ({
    name: `${v}/5`,
    cantidad: data.filter(r => r.sumatoria_cumplimiento === v).length,
  }))

  return (
    <div className="p-6 lg:p-8 animate-fade-in space-y-6">
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Observaciones" value={total}          color="indigo" />
        <KpiCard label="Cumplimiento Global"  value={`${pct}%`}     color={pct >= 80 ? 'emerald' : 'red'} sub={`${cumple} CUMPLE`} />
        <KpiCard label="Prom. Sumatoria"      value={avgSumatoria}  color="blue" sub="momentos / observación" />
        <KpiCard label="NO CUMPLE"            value={noCumple}      color="red" />
      </div>

      {total === 0 ? (
        <div className="card p-8 text-center text-slate-400">No hay registros disponibles</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <div className="card p-5">
            <h3 className="section-title mb-4">Resultado Global</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
                  labelLine={false}>
                  {pieData.map((e, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
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
      )}
    </div>
  )
}
