import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDate, estadoBadgeColor, estadoLabel } from '../../lib/utils'
import DataTable from '../../components/common/DataTable'
import ExportButtons from '../../components/common/ExportButtons'
import { Plus, Eye, Pencil, Trash2, ShieldAlert, BarChart3 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const EXPORT_COLS = [
  { key: 'fecha_registro',   label: 'Fecha',             width: 12 },
  { key: 'servicio',         label: 'Servicio',           width: 20 },
  { key: 'profesional',      label: 'Profesional',        width: 20 },
  { key: 'tipo_aislamiento', label: 'Tipo Aislamiento',   width: 22 },
  { key: 'adherencia',       label: 'Adherencia',         width: 14 },
  { key: 'nombre_evaluado',  label: 'Evaluado',           width: 22 },
  { key: 'estado',           label: 'Estado',             width: 14 },
]

export default function Aislamiento() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { rol }  = useAuth()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: rows } = await supabase
      .from('encuesta_aislamiento')
      .select('*')
      .order('created_at', { ascending: false })
    setData(rows ?? [])
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este registro?')) return
    await supabase.from('encuesta_aislamiento').delete().eq('id', id)
    setData(prev => prev.filter(r => r.id !== id))
  }

  const columns = [
    { key: 'fecha_registro',   header: 'Fecha',            sortable: true, render: v => <span className="text-slate-600">{formatDate(v)}</span> },
    { key: 'servicio',         header: 'Servicio',         sortable: true },
    { key: 'profesional',      header: 'Profesional',      sortable: true },
    { key: 'tipo_aislamiento', header: 'Tipo Aislamiento', sortable: true },
    { key: 'adherencia',       header: 'Adherencia',       sortable: true,
      render: v => <span className={`badge ${v === 'CUMPLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>{v ?? '—'}</span> },
    { key: 'estado',           header: 'Estado',           sortable: true,
      render: v => <span className={`badge ${estadoBadgeColor(v)}`}>{estadoLabel(v)}</span> },
    { key: 'nombre_evaluado',  header: 'Evaluado' },
  ]

  const exportData = data.map(r => ({
    ...r,
    estado: estadoLabel(r.estado),
  }))

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h1 className="page-title">Aislamiento Hospitalario</h1>
            <p className="page-subtitle">Encuestas de adherencia a protocolos de aislamiento</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/encuestas/aislamiento/dashboard" className="btn-secondary text-xs gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <Link to="/encuestas/aislamiento/nuevo" className="btn-primary text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Nueva Encuesta
          </Link>
        </div>
      </div>

      {/* Tabla */}
      <div className="card p-4">
        <div className="flex justify-end mb-3">
          <ExportButtons
            data={exportData} columns={EXPORT_COLS}
            filename="aislamiento_hospitalario"
            title="Encuesta de Aislamiento Hospitalario"
            subtitle="Clínica de Alta Complejidad Santa Bárbara"
          />
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <DataTable
            data={data}
            columns={columns}
            searchPlaceholder="Buscar por servicio, evaluado..."
            emptyMessage="No hay registros de aislamiento"
            actions={row => (
              <div className="flex items-center justify-end gap-1">
                <Link to={`/encuestas/aislamiento/${row.id}`}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors">
                  <Eye className="w-3.5 h-3.5" />
                </Link>
                {rol !== 'auxiliar' && (
                  <Link to={`/encuestas/aislamiento/${row.id}/editar`}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-amber-600 transition-colors">
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
