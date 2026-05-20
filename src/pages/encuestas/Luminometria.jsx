import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDate, estadoBadgeColor, estadoLabel } from '../../lib/utils'
import DataTable from '../../components/common/DataTable'
import ExportButtons from '../../components/common/ExportButtons'
import { Plus, Pencil, Trash2, Microscope, BarChart3 } from 'lucide-react'

function rangoBadge(r) {
  if (r === 'Aceptable')          return 'bg-emerald-100 text-emerald-800'
  if (r === 'Aceptable Marginal') return 'bg-yellow-100  text-yellow-800'
  if (r === 'Inaceptable')        return 'bg-red-100     text-red-800'
  return 'bg-slate-100 text-slate-600'
}

const EXPORT_COLS = [
  { key: 'fecha_registro',    label: 'Fecha',        width: 12 },
  { key: 'servicio_evaluado', label: 'Servicio',      width: 20 },
  { key: 'objeto',            label: 'Superficie',    width: 24 },
  { key: 'resultado',         label: 'RLU',           width:  8 },
  { key: 'rango',             label: 'Clasificación', width: 18 },
  { key: 'estado',            label: 'Estado',        width: 12 },
]

export default function Luminometria() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: rows } = await supabase
      .from('encuesta_luminometria')
      .select('*')
      .order('fecha_registro', { ascending: false })
    setData(rows ?? [])
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este registro?')) return
    await supabase.from('encuesta_luminometria').delete().eq('id', id)
    setData(prev => prev.filter(r => r.id !== id))
  }

  const columns = [
    { key: 'fecha_registro',    header: 'Fecha',        sortable: true,
      render: v => <span className="text-slate-600">{formatDate(v)}</span> },
    { key: 'servicio_evaluado', header: 'Servicio',     sortable: true },
    { key: 'objeto',            header: 'Superficie',   sortable: true },
    { key: 'resultado',         header: 'RLU',          sortable: true,
      render: v => <span className="font-mono font-semibold text-slate-700">{v ?? '—'}</span> },
    { key: 'rango',             header: 'Clasificación', sortable: true,
      render: v => v ? <span className={`badge ${rangoBadge(v)}`}>{v}</span> : '—' },
    { key: 'estado',            header: 'Estado',       sortable: true,
      render: v => <span className={`badge ${estadoBadgeColor(v)}`}>{estadoLabel(v)}</span> },
  ]

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
            <Microscope className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="page-title">Luminometría</h1>
            <p className="page-subtitle">Control de limpieza por ATP bioluminiscencia</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/encuestas/luminometria/dashboard" className="btn-secondary text-xs gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <Link to="/encuestas/luminometria/nuevo" className="btn-primary text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Nueva Medición
          </Link>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex justify-end mb-3">
          <ExportButtons
            data={data.map(r => ({ ...r, estado: estadoLabel(r.estado) }))}
            columns={EXPORT_COLS}
            filename="luminometria"
            title="Luminometría — Control de Limpieza"
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
            searchPlaceholder="Buscar por servicio, superficie..."
            emptyMessage="No hay registros de luminometría"
            actions={row => (
              <div className="flex items-center justify-end gap-1">
                <Link to={`/encuestas/luminometria/${row.id}/editar`}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-amber-600 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </Link>
                <button onClick={() => handleDelete(row.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          />
        )}
      </div>
    </div>
  )
}
