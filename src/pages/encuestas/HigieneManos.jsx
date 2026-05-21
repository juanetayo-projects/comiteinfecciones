import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDate, estadoBadgeColor, estadoLabel } from '../../lib/utils'
import DataTable from '../../components/common/DataTable'
import ExportButtons from '../../components/common/ExportButtons'
import { Plus, Pencil, Trash2, Hand, BarChart3 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

function cumpleColor(v) {
  if (v === 'Cumple')    return 'bg-emerald-100 text-emerald-800'
  if (v === 'No Cumple') return 'bg-red-100 text-red-800'
  return 'bg-slate-100 text-slate-600'
}

const EXPORT_COLS = [
  { key: 'fecha_evaluacion',    label: 'Fecha',             width: 12 },
  { key: 'servicio_evaluado',   label: 'Servicio',           width: 18 },
  { key: 'nombre_evaluado',     label: 'Evaluado',           width: 22 },
  { key: 'perfil_colaborador',  label: 'Perfil',             width: 16 },
  { key: 'sumatoria_cumplimiento', label: 'Momentos OK',     width: 10 },
  { key: 'resultado_cumplimiento', label: 'Resultado',       width: 12 },
  { key: 'estado',              label: 'Estado',             width: 12 },
]

export default function HigieneManos() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const { rol }  = useAuth()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: rows } = await supabase
      .from('encuesta_higiene_manos')
      .select('*')
      .order('fecha_registro', { ascending: false })
    setData(rows ?? [])
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este registro?')) return
    await supabase.from('encuesta_higiene_manos').delete().eq('id', id)
    setData(prev => prev.filter(r => r.id !== id))
  }

  const columns = [
    { key: 'fecha_evaluacion',   header: 'Fecha',    sortable: true,
      render: v => <span className="text-slate-600">{formatDate(v)}</span> },
    { key: 'servicio_evaluado',  header: 'Servicio', sortable: true },
    { key: 'nombre_evaluado',    header: 'Evaluado', sortable: true },
    { key: 'perfil_colaborador', header: 'Perfil',   sortable: true },
    { key: 'sumatoria_cumplimiento', header: 'Momentos',  sortable: true,
      render: v => <span className="font-semibold text-slate-700">{v ?? 0}/5</span> },
    { key: 'resultado_cumplimiento', header: 'Resultado', sortable: true,
      render: v => v ? <span className={`badge ${cumpleColor(v)}`}>{v}</span> : '—' },
    { key: 'estado', header: 'Estado', sortable: true,
      render: v => <span className={`badge ${estadoBadgeColor(v)}`}>{estadoLabel(v)}</span> },
  ]

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
            <Hand className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="page-title">Higiene de Manos</h1>
            <p className="page-subtitle">Observación de los 5 momentos OMS</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/encuestas/higiene-manos/dashboard" className="btn-secondary text-xs gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <Link to="/encuestas/higiene-manos/nuevo" className="btn-primary text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Nueva Observación
          </Link>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex justify-end mb-3">
          <ExportButtons
            data={data.map(r => ({ ...r, estado: estadoLabel(r.estado) }))}
            columns={EXPORT_COLS}
            filename="higiene_manos"
            title="Higiene de Manos — 5 Momentos OMS"
            subtitle="Clínica de Alta Complejidad Santa Bárbara"
          />
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <DataTable
            data={data} columns={columns}
            searchPlaceholder="Buscar por servicio, evaluado..."
            emptyMessage="No hay registros de higiene de manos"
            actions={row => (
              <div className="flex items-center justify-end gap-1">
                {rol !== 'auxiliar' && (
                  <Link to={`/encuestas/higiene-manos/${row.id}/editar`}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </Link>
                )}
                {rol === 'administrador' && (
                  <button onClick={() => handleDelete(row.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          />
        )}
      </div>
    </div>
  )
}
