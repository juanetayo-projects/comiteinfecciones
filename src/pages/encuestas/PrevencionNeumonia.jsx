import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { esEditable } from '../../lib/guardarEncuesta'
import { formatDate, estadoBadgeColor, estadoLabel } from '../../lib/utils'
import DataTable from '../../components/common/DataTable'
import ExportButtons from '../../components/common/ExportButtons'
import { Plus, Paperclip, Pencil, Trash2, Wind, ArrowLeft, BarChart3 , Eye } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import AdjuntosModal from '../../components/common/AdjuntosModal'
import TableFilters, { useTableFilters } from '../../components/common/TableFilters'
import { ESTADO_OPTIONS } from '../../lib/utils'

const FILTER_CONFIG = [
  { key: 'fecha_registro', label: 'Fecha',          type: 'daterange' },
  { key: 'ubicacion_cama', label: 'Ubicación/Cama',  type: 'select' },
  { key: 'estado',         label: 'Estado',          type: 'select', options: ESTADO_OPTIONS },
]

const EXPORT_COLS = [
  { key: 'fecha_registro',         label: 'Fecha',      width: 12 },
  { key: 'ubicacion_cama',         label: 'Cama',        width: 16 },
  { key: 'num_casos',              label: '# Casos',     width: 10 },
  { key: 'documento_identificacion', label: 'Documento', width: 14 },
  { key: 'estado',                 label: 'Estado',      width: 12 },
]

export default function PrevencionNeumonia() {
  const [data,     setData]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [adjModal, setAdjModal] = useState(null)
  const { rol }  = useAuth()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: rows } = await supabase
      .from('encuesta_prevencion_neumonia')
      .select('*')
      .order('created_at', { ascending: false })
    setData(rows ?? [])
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este registro?')) return
    await supabase.from('encuesta_prevencion_neumonia').delete().eq('id', id)
    setData(prev => prev.filter(r => r.id !== id))
  }

  const ft = useTableFilters(data, FILTER_CONFIG)

  const columns = [
    { key: 'fecha_registro',  header: 'Fecha',   sortable: true,
      render: v => <span className="text-slate-600">{formatDate(v)}</span> },
    { key: 'ubicacion_cama',  header: 'Cama',     sortable: true },
    { key: 'num_casos',       header: '# Casos',  sortable: true },
    { key: 'documento_identificacion', header: 'Documento', sortable: true },
    { key: 'criterio_1_cabecera', header: 'Cabecera',
      render: v => v
        ? <span className="badge bg-emerald-100 text-emerald-800">Sí</span>
        : <span className="badge bg-red-100 text-red-800">No</span> },
    { key: 'criterio_2_higiene_oral', header: 'Hig. Oral',
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
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
            <Wind className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="page-title">Prevención de Neumonía (NAV)</h1>
            <p className="page-subtitle">Neumonía asociada a ventilación mecánica</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/encuestas/prevencion-neumonia/dashboard" className="btn-secondary text-xs gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <Link to="/encuestas/prevencion-neumonia/nuevo" className="btn-primary text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Nuevo Registro
          </Link>
        </div>
      </div>

      <div className="card p-4">
        <TableFilters
          config={FILTER_CONFIG} {...ft}
          total={data.length} shown={ft.filtered.length}
        />
        <div className="flex justify-end mb-3">
          <ExportButtons
            data={ft.filtered.map(r => ({ ...r, estado: estadoLabel(r.estado) }))}
            columns={EXPORT_COLS}
            filename="prevencion_neumonia"
            title="Prevención de Neumonía (NAV)"
            subtitle="Clínica de Alta Complejidad Santa Bárbara"
            filtros={ft.summary}
          />
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <DataTable
            data={ft.filtered} columns={columns}
            searchPlaceholder="Buscar por cama, documento..."
            emptyMessage="No hay registros de prevención de neumonía"
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
                  <Link to={`/encuestas/prevencion-neumonia/${row.id}/editar`}
                    title={esEditable(row.estado, rol) ? 'Editar' : 'Ver — registro cerrado a edición'}
                    className={`p-1.5 rounded-lg hover:bg-slate-100 transition-colors ${
                      esEditable(row.estado, rol)
                        ? 'text-slate-500 hover:text-amber-600'
                        : 'text-slate-400 hover:text-brand-600'}`}>
                    {esEditable(row.estado, rol)
                      ? <Pencil className="w-3.5 h-3.5" />
                      : <Eye className="w-3.5 h-3.5" />}
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
