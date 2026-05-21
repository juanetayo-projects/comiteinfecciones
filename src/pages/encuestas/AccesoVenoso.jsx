import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDate, estadoBadgeColor, estadoLabel } from '../../lib/utils'
import DataTable from '../../components/common/DataTable'
import ExportButtons from '../../components/common/ExportButtons'
import { Plus, Paperclip, Pencil, Trash2, Syringe, ArrowLeft, BarChart3 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import AdjuntosModal from '../../components/common/AdjuntosModal'

const EXPORT_COLS = [
  { key: 'fecha_registro',   label: 'Fecha',         width: 12 },
  { key: 'ubicacion_cama',   label: 'Ubicación/Cama', width: 16 },
  { key: 'num_accesos',      label: '# Accesos',      width: 10 },
  { key: 'cc',               label: 'CC Paciente',    width: 14 },
  { key: 'estado',           label: 'Estado',         width: 12 },
]

function boolBadge(v) {
  return v
    ? <span className="badge bg-emerald-100 text-emerald-800">Sí</span>
    : <span className="badge bg-red-100 text-red-800">No</span>
}

export default function AccesoVenoso() {
  const [data,     setData]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [adjModal, setAdjModal] = useState(null)
  const { rol }  = useAuth()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: rows } = await supabase
      .from('encuesta_acceso_venoso')
      .select('*')
      .order('created_at', { ascending: false })
    setData(rows ?? [])
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este registro?')) return
    await supabase.from('encuesta_acceso_venoso').delete().eq('id', id)
    setData(prev => prev.filter(r => r.id !== id))
  }

  const columns = [
    { key: 'fecha_registro', header: 'Fecha',        sortable: true,
      render: v => <span className="text-slate-600">{formatDate(v)}</span> },
    { key: 'ubicacion_cama', header: 'Cama',          sortable: true },
    { key: 'num_accesos',    header: '# Accesos',     sortable: true },
    { key: 'cc',             header: 'CC Paciente',   sortable: true },
    { key: 'criterio_1_rotulo',       header: 'Rótulo',      render: boolBadge },
    { key: 'criterio_2_fijacion',     header: 'Fijación',    render: boolBadge },
    { key: 'criterio_4_pertinencia',  header: 'Pertinencia', render: boolBadge },
    { key: 'estado',         header: 'Estado',        sortable: true,
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
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
            <Syringe className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="page-title">Acceso Venoso Periférico</h1>
            <p className="page-subtitle">Vigilancia de catéteres periféricos (AVP)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/encuestas/acceso-venoso/dashboard" className="btn-secondary text-xs gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <Link to="/encuestas/acceso-venoso/nuevo" className="btn-primary text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Nuevo Registro
          </Link>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex justify-end mb-3">
          <ExportButtons
            data={data.map(r => ({ ...r, estado: estadoLabel(r.estado) }))}
            columns={EXPORT_COLS}
            filename="acceso_venoso"
            title="Acceso Venoso Periférico"
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
            searchPlaceholder="Buscar por cama, CC..."
            emptyMessage="No hay registros de acceso venoso"
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
                  <Link to={`/encuestas/acceso-venoso/${row.id}/editar`}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-emerald-600 transition-colors">
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
