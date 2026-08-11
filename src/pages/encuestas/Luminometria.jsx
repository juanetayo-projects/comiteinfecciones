import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { esEditable } from '../../lib/guardarEncuesta'
import { formatDate, estadoBadgeColor, estadoLabel } from '../../lib/utils'
import DataTable from '../../components/common/DataTable'
import ExportButtons from '../../components/common/ExportButtons'
import { Plus, Paperclip, Pencil, Trash2, Microscope, BarChart3 , Eye } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import AdjuntosModal from '../../components/common/AdjuntosModal'
import TableFilters, { useTableFilters } from '../../components/common/TableFilters'
import { ESTADO_OPTIONS, CUMPLE_OPTIONS } from '../../lib/utils'

const FILTER_CONFIG = [
  { key: 'fecha_registro',    label: 'Fecha',         type: 'daterange' },
  { key: 'servicio_evaluado', label: 'Servicio',       type: 'select' },
  { key: 'objeto',            label: 'Superficie',     type: 'select' },
  { key: 'rango',             label: 'Clasificación',  type: 'select', options: CUMPLE_OPTIONS },
  { key: 'estado',            label: 'Estado',         type: 'select', options: ESTADO_OPTIONS },
]

function rangoBadge(r) {
  if (r === 'CUMPLE')    return 'bg-emerald-100 text-emerald-800'
  if (r === 'NO CUMPLE') return 'bg-red-100 text-red-800'
  return 'bg-slate-100 text-slate-600'
}

const EXPORT_COLS = [
  { key: 'fecha_registro',    label: 'Fecha',        width: 12 },
  { key: 'servicio_evaluado', label: 'Servicio',      width: 20 },
  { key: 'objeto',            label: 'Superficie',    width: 24 },
  { key: 'resultado',         label: 'RLU',           width:  8 },
  { key: 'rango',             label: 'Clasificación', width: 18 },
  { key: 'observaciones',     label: 'Observaciones', width: 40 },
  { key: 'estado',            label: 'Estado',        width: 12 },
]

export default function Luminometria() {
  const [data,     setData]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [adjModal, setAdjModal] = useState(null)
  const { rol, puedeCapturar: puedeCapturarModulo }  = useAuth()
  const puedeCapturar = puedeCapturarModulo('luminometria')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: rows } = await supabase
      .from('encuesta_luminometria')
      .select('*')
      .order('created_at', { ascending: false })
    setData(rows ?? [])
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este registro?')) return
    await supabase.from('encuesta_luminometria').delete().eq('id', id)
    setData(prev => prev.filter(r => r.id !== id))
  }

  const ft = useTableFilters(data, FILTER_CONFIG)

  const columns = [
    { key: 'fecha_registro',    header: 'Fecha',        sortable: true,
      render: v => <span className="text-slate-600">{formatDate(v)}</span> },
    { key: 'servicio_evaluado', header: 'Servicio',     sortable: true },
    { key: 'objeto',            header: 'Superficie',   sortable: true },
    { key: 'resultado',         header: 'RLU',          sortable: true,
      render: v => <span className="font-mono font-semibold text-slate-700">{v ?? '—'}</span> },
    { key: 'observaciones',     header: 'Observaciones',
      render: v => v ? <span className="text-slate-600" title={v}>{v.length > 40 ? v.slice(0,40) + '…' : v}</span> : '—' },
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
          {puedeCapturar && (
            <Link to="/encuestas/luminometria/nuevo" className="btn-primary text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Nueva Medición
            </Link>
          )}
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
            filename="luminometria"
            title="Luminometría — Control de Limpieza"
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
            searchPlaceholder="Buscar por servicio, superficie..."
            emptyMessage="No hay registros de luminometría"
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
                  <Link to={`/encuestas/luminometria/${row.id}/editar`}
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
