import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDate, estadoBadgeColor, estadoLabel } from '../../lib/utils'
import DataTable from '../../components/common/DataTable'
import ExportButtons from '../../components/common/ExportButtons'
import { Plus, Paperclip, Pencil, Trash2, Droplets, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import AdjuntosModal from '../../components/common/AdjuntosModal'

const EXPORT_COLS = [
  { key: 'fecha_registro',          label: 'Fecha',         width: 12 },
  { key: 'ubicacion_cama',          label: 'Cama',           width: 16 },
  { key: 'num_casos',               label: '# Casos',        width: 10 },
  { key: 'documento_identificacion',label: 'Documento',      width: 14 },
  { key: 'estado',                  label: 'Estado',         width: 12 },
]

export default function CateterVesical() {
  const [data,     setData]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [adjModal, setAdjModal] = useState(null)
  const { rol }  = useAuth()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: rows } = await supabase
      .from('encuesta_cateter_vesical')
      .select('*')
      .order('fecha_registro', { ascending: false })
    setData(rows ?? [])
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este registro?')) return
    await supabase.from('encuesta_cateter_vesical').delete().eq('id', id)
    setData(prev => prev.filter(r => r.id !== id))
  }

  const columns = [
    { key: 'fecha_registro', header: 'Fecha',   sortable: true,
      render: v => <span className="text-slate-600">{formatDate(v)}</span> },
    { key: 'ubicacion_cama', header: 'Cama',     sortable: true },
    { key: 'num_casos',      header: '# Casos',  sortable: true },
    { key: 'documento_identificacion', header: 'Documento', sortable: true },
    { key: 'criterio_1_fijacion',   header: 'Fijación',
      render: v => v
        ? <span className="badge bg-emerald-100 text-emerald-800">Sí</span>
        : <span className="badge bg-red-100 text-red-800">No</span> },
    { key: 'criterio_4_indicacion', header: 'Indicación',
      render: v => v
        ? <span className="badge bg-emerald-100 text-emerald-800">Sí</span>
        : <span className="badge bg-red-100 text-red-800">No</span> },
    { key: 'estado', header: 'Estado', sortable: true,
      render: v => <span className={`badge ${estadoBadgeColor(v)}`}>{estadoLabel(v)}</span> },
  ]

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link to="/encuestas/seguimiento-dispositivos"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
            <Droplets className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="page-title">Catéter Vesical</h1>
            <p className="page-subtitle">Vigilancia de sondas vesicales</p>
          </div>
        </div>
        <Link to="/encuestas/cateter-vesical/nuevo" className="btn-primary text-xs gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Nuevo Registro
        </Link>
      </div>

      <div className="card p-4">
        <div className="flex justify-end mb-3">
          <ExportButtons
            data={data.map(r => ({ ...r, estado: estadoLabel(r.estado) }))}
            columns={EXPORT_COLS}
            filename="cateter_vesical"
            title="Catéter Vesical"
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
            searchPlaceholder="Buscar por cama, documento..."
            emptyMessage="No hay registros de catéter vesical"
            actions={row => (
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={() => setAdjModal(row.adjuntos ?? [])}
                  title={`${row.adjuntos?.length ?? 0} adjunto(s)`}
                  className={`p-1.5 rounded-lg hover:bg-slate-100 transition-colors ${
                    (row.adjuntos?.length > 0)
                      ? 'text-blue-500 hover:text-blue-700'
                      : 'text-slate-300 cursor-default'
                  }`}>
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
                {rol !== 'auxiliar' && (
                  <Link to={`/encuestas/cateter-vesical/${row.id}/editar`}
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

      <AdjuntosModal adjuntos={adjModal} onClose={() => setAdjModal(null)} />
    </div>
  )
}
