import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, Stethoscope } from 'lucide-react'

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

// Criterios a analizar de adherencia global
const CRITERIOS_KEY = [
  { key: 'jabones_toallas',          label: 'Jabones/Toallas' },
  { key: 'guardianes_fijos_rotulados', label: 'Guardianes' },
  { key: 'puertas_cerradas',         label: 'Puertas Cerradas' },
  { key: 'lista_chequeo_cx_segura',  label: 'Lista Cx. Segura' },
  { key: 'coloca_antibiotico_antes', label: 'Antibiótico Previo' },
  { key: 'cumplimiento_profilaxis',  label: 'Profilaxis' },
  { key: 'lavado_manos_quirurgico',  label: 'Lavado Quirúrgico' },
  { key: 'epp_completo',             label: 'EPP Completo' },
]

export default function RondaDashboard() {
  const [data, setData]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('encuesta_ronda_cirugia').select('*').order('fecha_registro', { ascending: false })
      .then(({ data: rows }) => { setData(rows ?? []); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="p-8 flex justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const total = data.length

  // Profilaxis compliance
  const profilaxis = data.filter(r => r.cumplimiento_profilaxis === 'CUMPLE').length
  const pctPro     = total > 0 ? Math.round((profilaxis / total) * 100) : 0

  // Distribución por quirófano
  const byQ = {}
  data.forEach(r => {
    const q = `Qx ${r.quirofano || '?'}`
    if (!byQ[q]) byQ[q] = { name: q, registros: 0 }
    byQ[q].registros++
  })
  const barQ = Object.values(byQ).sort((a,b) => a.name.localeCompare(b.name))

  // Distribución profilaxis por quirófano
  const proQ = {}
  data.forEach(r => {
    const q = `Qx ${r.quirofano || '?'}`
    if (!proQ[q]) proQ[q] = { name: q, CUMPLE: 0, 'NO CUMPLE': 0, 'NO APLICA': 0, 'SIN DATO': 0 }
    const v = r.cumplimiento_profilaxis || 'SIN DATO'
    if (proQ[q][v] !== undefined) proQ[q][v]++
    else proQ[q]['SIN DATO']++
  })
  const barProQ = Object.values(proQ).sort((a,b) => a.name.localeCompare(b.name))

  // Cumplimiento por criterio
  const criteriosData = CRITERIOS_KEY.map(c => {
    const withData = data.filter(r => r[c.key])
    const cumple   = withData.filter(r => r[c.key] === 'CUMPLE').length
    const total2   = withData.length
    return {
      name: c.label,
      CUMPLE: cumple,
      'NO CUMPLE': withData.filter(r => r[c.key] === 'NO CUMPLE').length,
      'NO APLICA': withData.filter(r => r[c.key] === 'NO APLICA').length,
    }
  })

  // Pie: profilaxis breakdown
  const piePro = ['CUMPLE','NO CUMPLE','NO APLICA','SIN DATO'].map(v => ({
    name: v,
    value: data.filter(r => (r.cumplimiento_profilaxis || 'SIN DATO') === v).length,
  })).filter(d => d.value > 0)

  return (
    <div className="p-6 lg:p-8 animate-fade-in space-y-6">
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Rondas"        value={total}      color="indigo" />
        <KpiCard label="Profilaxis CUMPLE"   value={`${pctPro}%`} color={pctPro >= 80 ? 'emerald' : 'red'} sub={`${profilaxis} de ${total}`} />
        <KpiCard label="Quirófanos activos"  value={Object.keys(byQ).length} color="purple" />
        <KpiCard label="Sin profilaxis data" value={data.filter(r => !r.cumplimiento_profilaxis).length} color="slate" />
      </div>

      {total === 0 ? (
        <div className="card p-8 text-center text-slate-400">No hay registros disponibles</div>
      ) : (
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
      )}
    </div>
  )
}
