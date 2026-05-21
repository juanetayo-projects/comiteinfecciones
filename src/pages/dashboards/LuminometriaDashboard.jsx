import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, ScatterChart, Scatter, ZAxis,
} from 'recharts'
import { ArrowLeft, Microscope } from 'lucide-react'

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

export default function LuminometriaDashboard() {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('encuesta_luminometria').select('*').order('fecha_registro', { ascending: false })
      .then(({ data: rows }) => { setData(rows ?? []); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="p-8 flex justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const total    = data.length
  const cumple   = data.filter(r => r.rango === 'CUMPLE').length
  const noCumple = total - cumple
  const pct      = total > 0 ? Math.round((cumple / total) * 100) : 0
  const avgRLU   = total > 0
    ? Math.round(data.reduce((s, r) => s + (Number(r.resultado) || 0), 0) / total)
    : 0

  const pieData = [
    { name: 'CUMPLE (<100 RLU)',    value: cumple },
    { name: 'NO CUMPLE (≥100 RLU)', value: noCumple },
  ].filter(d => d.value > 0)

  // Por servicio
  const byServicio = {}
  data.forEach(r => {
    const s = r.servicio_evaluado || 'Sin servicio'
    if (!byServicio[s]) byServicio[s] = { name: s, CUMPLE: 0, 'NO CUMPLE': 0 }
    r.rango === 'CUMPLE' ? byServicio[s].CUMPLE++ : byServicio[s]['NO CUMPLE']++
  })
  const barServicio = Object.values(byServicio)

  // Por objeto
  const byObjeto = {}
  data.forEach(r => {
    const o = r.objeto || 'Sin objeto'
    if (!byObjeto[o]) byObjeto[o] = { name: o, CUMPLE: 0, 'NO CUMPLE': 0, totalRLU: 0, count: 0 }
    r.rango === 'CUMPLE' ? byObjeto[o].CUMPLE++ : byObjeto[o]['NO CUMPLE']++
    byObjeto[o].totalRLU += Number(r.resultado) || 0
    byObjeto[o].count++
  })
  const barObjeto = Object.values(byObjeto).map(o => ({
    ...o,
    avgRLU: Math.round(o.totalRLU / o.count),
  }))

  return (
    <div className="p-6 lg:p-8 animate-fade-in space-y-6">
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Mediciones"  value={total}       color="indigo" />
        <KpiCard label="CUMPLE (<100 RLU)" value={`${pct}%`}  color={pct >= 80 ? 'emerald' : 'red'} sub={`${cumple} superficies`} />
        <KpiCard label="Promedio RLU"      value={avgRLU}      color="amber" sub="valor medio" />
        <KpiCard label="NO CUMPLE"         value={noCumple}    color="red" sub="requieren limpieza" />
      </div>

      {total === 0 ? (
        <div className="card p-8 text-center text-slate-400">No hay registros disponibles</div>
      ) : (
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
                {/* línea de corte en 100 */}
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-400 mt-2">Línea de corte: 100 RLU (CUMPLE si &lt; 100)</p>
          </div>
        </div>
      )}
    </div>
  )
}
