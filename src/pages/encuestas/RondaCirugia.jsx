import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDate, estadoBadgeColor, estadoLabel } from '../../lib/utils'
import DataTable from '../../components/common/DataTable'
import ExportButtons from '../../components/common/ExportButtons'
import { Plus, Paperclip, Pencil, Trash2, Stethoscope, BarChart3 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import AdjuntosModal from '../../components/common/AdjuntosModal'

function cumpleColor(v) {
  if (v === 'CUMPLE')    return 'bg-emerald-100 text-emerald-800'
  if (v === 'NO CUMPLE') return 'bg-red-100 text-red-800'
  if (v === 'NO APLICA') return 'bg-slate-100 text-slate-600'
  if (v === 'SIN DATO')  return 'bg-yellow-100 text-yellow-700'
  return 'bg-slate-100 text-slate-600'
}
function cumpleLabel(v) {
  if (v === 'CUMPLE')    return 'Cumple'
  if (v === 'NO CUMPLE') return 'No Cumple'
  if (v === 'NO APLICA') return 'N/A'
  if (v === 'SIN DATO')  return 'Sin dato'
  return v || '—'
}

const EXPORT_COLS = [
  { key: 'fecha_registro',          label: 'Fecha',         width: 12 },
  { key: 'quirofano',               label: 'Quirófano',     width: 14 },
  { key: 'servicio',                label: 'Servicio',      width: 18 },
  { key: 'especialidad',            label: 'Especialidad',  width: 18 },
  { key: 'profesional',             label: 'Profesional',   width: 20 },
  { key: 'cumplimiento_profilaxis', label: 'Profilaxis',    width: 12 },
  { key: 'estado',                  label: 'Estado',        width: 12 },
]

export default function RondaCirugia() {
  const [data,     setData]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [adjModal, setAdjModal] = useState(null)
  const { rol }  = useAuth()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: rows } = await supabase
      .from('encuesta_ronda_cirugia')
      .select('*')
      .order('fecha_registro', { ascending: false })
    setData(rows ?? [])
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este registro?')) return
    await supabase.from('encuesta_ronda_cirugia').delete().eq('id', id)
    setData(prev => prev.filter(r => r.id !== id))
  }

  const columns = [
    { key: 'fecha_registro',          header: 'Fecha',       sortable: true,
      render: v => <span className="text-slate-600">{formatDate(v)}</span> },
    { key: 'quirofano',               header: 'Quirófano',   sortable: true },
    { key: 'servicio',                header: 'Servicio',    sortable: true },
    { key: 'especialidad',            header: 'Especialidad', sortable: true },
    { key: 'profesional',             header: 'Profesional', sortable: true },
    { key: 'cumplimiento_profilaxis', header: 'Profilaxis',  sortable: true,
      render: v => <span className={`badge ${cumpleColor(v)}`}>{cumpleLabel(v)}</span> },
    { key: 'estado',                  header: 'Estado',      sortable: true,
      render: v => <span className={`badge ${estadoBadgeColor(v)}`}>{estadoLabel(v)}</span> },
  ]

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h1 className="page-title">Ronda de Cirugía</h1>
            <p className="page-subtitle">Control de infecciones en área quirúrgica</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/encuestas/ronda-cirugia/dashboard" className="btn-secondary text-xs gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <Link to="/encuestas/ronda-cirugia/nuevo" className="btn-primary text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Nueva Ronda
          </Link>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex justify-end mb-3">
          <ExportButtons
            data={data.map(r => ({ ...r, estado: estadoLabel(r.estado) }))}
            columns={EXPORT_COLS}
            filename="ronda_cirugia"
            title="Ronda de Cirugía — Control de Infecciones"
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
            searchPlaceholder="Buscar por quirófano, servicio, profesional..."
            emptyMessage="No hay registros de ronda de cirugía"
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
                  <Link to={`/encuestas/ronda-cirugia/${row.id}/editar`}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-purple-600 transition-colors">
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
