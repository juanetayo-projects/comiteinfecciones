import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { esEditable } from '../../lib/guardarEncuesta'
import { formatDate, estadoBadgeColor, estadoLabel } from '../../lib/utils'
import DataTable from '../../components/common/DataTable'
import ExportButtons from '../../components/common/ExportButtons'
import TableFilters, { useTableFilters } from '../../components/common/TableFilters'
import { ESTADO_OPTIONS } from '../../lib/utils'
import { Plus, Pencil, Trash2, ClipboardCheck, BarChart3, Eye } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const RESULTADO_OPTIONS = ['ADECUADO', 'CON ERROR']

const MESES_OPTIONS = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
].map((label, i) => ({ value: i + 1, label }))

const FILTER_CONFIG = [
  { key: 'anio',           label: 'Año',        type: 'select' },
  { key: 'mes_num',        label: 'Mes',        type: 'select', options: MESES_OPTIONS },
  { key: 'sede',           label: 'Sede',       type: 'select' },
  { key: 'servicio',       label: 'Servicio',   type: 'select' },
  { key: 'resultado',      label: 'Resultado',  type: 'select', options: RESULTADO_OPTIONS },
  { key: 'tipo_error',     label: 'Tipo Error', type: 'select' },
  { key: 'estado',         label: 'Estado',     type: 'select', options: ESTADO_OPTIONS },
]

function resultadoColor(v) {
  if (v === 'ADECUADO') return 'bg-emerald-100 text-emerald-800'
  if (v === 'CON ERROR') return 'bg-red-100 text-red-800'
  return 'bg-slate-100 text-slate-600'
}

const EXPORT_COLS = [
  { key: 'fecha_revision', label: 'Fecha',      width: 12 },
  { key: 'sede',           label: 'Sede',        width: 16 },
  { key: 'servicio',       label: 'Servicio',    width: 20 },
  { key: 'medico',         label: 'Médico',      width: 24 },
  { key: 'codigo_evento',  label: 'Código',      width: 12 },
  { key: 'resultado',      label: 'Resultado',   width: 12 },
  { key: 'tipo_error',     label: 'Tipo Error',  width: 30 },
  { key: 'estado',         label: 'Estado',      width: 12 },
]

export default function AdherenciaFichas() {
  const [data,    setData]    = useState([])
  const [loading, setLoading] = useState(true)
  const { rol, puedeCapturar: puedeCapturarModulo } = useAuth()
  const puedeCapturar = rol !== 'lector_adherencia' && puedeCapturarModulo('adherencia_fichas')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: rows } = await supabase
      .from('encuesta_adherencia_fichas')
      .select('*')
      .order('fecha_revision', { ascending: false })
    setData(rows ?? [])
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este registro?')) return
    await supabase.from('encuesta_adherencia_fichas').delete().eq('id', id)
    setData(prev => prev.filter(r => r.id !== id))
  }

  const ft = useTableFilters(data, FILTER_CONFIG)

  const columns = [
    { key: 'fecha_revision', header: 'Fecha',    sortable: true,
      render: v => <span className="text-slate-600">{formatDate(v)}</span> },
    { key: 'sede',           header: 'Sede',      sortable: true },
    { key: 'servicio',       header: 'Servicio',  sortable: true },
    { key: 'medico',         header: 'Médico',    sortable: true },
    { key: 'codigo_evento',  header: 'Código',    sortable: true },
    { key: 'resultado',      header: 'Resultado', sortable: true,
      render: v => <span className={`badge ${resultadoColor(v)}`}>{v}</span> },
    { key: 'tipo_error',     header: 'Tipo Error', render: v => v || '—' },
    { key: 'estado', header: 'Estado', sortable: true,
      render: v => <span className={`badge ${estadoBadgeColor(v)}`}>{estadoLabel(v)}</span> },
  ]

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="page-title">Adherencia a Fichas Epidemiológicas</h1>
            <p className="page-subtitle">Correcto diligenciamiento de fichas SIVIGILA</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/encuestas/adherencia-fichas/dashboard" className="btn-secondary text-xs gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Dashboard
          </Link>
          {puedeCapturar && (
            <Link to="/encuestas/adherencia-fichas/nuevo" className="btn-primary text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Nueva Revisión
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
            filename="adherencia_fichas_epidemiologicas"
            title="Adherencia a Fichas Epidemiológicas"
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
            searchPlaceholder="Buscar por médico, servicio, código..."
            emptyMessage="No hay registros de adherencia a fichas epidemiológicas"
            actions={row => (
              <div className="flex items-center justify-end gap-1">
                <Link to={`/encuestas/adherencia-fichas/${row.id}/editar`}
                  title={puedeCapturar && esEditable(row.estado, rol) ? 'Editar' : 'Ver'}
                  className={`p-1.5 rounded-lg hover:bg-slate-100 transition-colors ${
                    puedeCapturar && esEditable(row.estado, rol)
                      ? 'text-slate-500 hover:text-amber-600'
                      : 'text-slate-400 hover:text-brand-600'}`}>
                  {puedeCapturar && esEditable(row.estado, rol)
                    ? <Pencil className="w-3.5 h-3.5" />
                    : <Eye className="w-3.5 h-3.5" />}
                </Link>
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
