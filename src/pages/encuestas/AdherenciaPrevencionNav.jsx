import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { esEditable } from '../../lib/guardarEncuesta'
import { formatDate, estadoBadgeColor, estadoLabel, ESTADO_OPTIONS } from '../../lib/utils'
import DataTable from '../../components/common/DataTable'
import ExportButtons from '../../components/common/ExportButtons'
import { Plus, Paperclip, Pencil, Trash2, Wind, ArrowLeft, BarChart3, Eye, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import AdjuntosModal from '../../components/common/AdjuntosModal'
import TableFilters, { useTableFilters } from '../../components/common/TableFilters'

const FILTER_CONFIG = [
  { key: 'fecha_registro', label: 'Fecha',    type: 'daterange' },
  { key: 'servicio',       label: 'Servicio', type: 'select' },
  { key: 'estado',         label: 'Estado',   type: 'select', options: ESTADO_OPTIONS },
]

const EXPORT_COLS = [
  { key: 'fecha_registro',                     label: 'Fecha',           width: 12 },
  { key: 'servicio',                           label: 'Servicio',        width: 12 },
  { key: 'documento_identificacion',           label: 'Documento',       width: 14 },
  { key: 'criterio_1_cabecera',                label: 'Cabecera',        width: 10 },
  { key: 'criterio_2_higiene_oral',            label: 'Hig. Oral',       width: 10 },
  { key: 'criterio_3_implementos',             label: 'Implementos',     width: 12 },
  { key: 'criterio_4_lista_chequeo',           label: 'Lista Chequeo',   width: 12 },
  { key: 'criterio_5_presion_neumotaponador',  label: 'Presión (22-30)', width: 14 },
  { key: 'criterio_6_interrupcion_sedacion',   label: 'Interr. Sedación', width: 14 },
  { key: 'estado',                             label: 'Estado',          width: 12 },
]

function BadgeSiNoNa({ v }) {
  if (v === 'SI') return <span className="badge bg-emerald-100 text-emerald-800">SI</span>
  if (v === 'NO') return <span className="badge bg-red-100 text-red-800">NO</span>
  if (v === 'NA') return <span className="badge bg-slate-100 text-slate-600">N/A</span>
  return <span className="text-slate-300">—</span>
}

export default function AdherenciaPrevencionNav() {
  const [data,     setData]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [adjModal, setAdjModal] = useState(null)
  const { rol, puedeCapturar: puedeCapturarModulo } = useAuth()
  const puedeCapturar = puedeCapturarModulo('adherencia_prevencion_nav')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: rows } = await supabase
      .from('encuesta_adherencia_prevencion_nav')
      .select('*')
      .order('fecha_registro', { ascending: false })
    setData(rows ?? [])
    setLoading(false)
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar este registro?')) return
    await supabase.from('encuesta_adherencia_prevencion_nav').delete().eq('id', id)
    setData(prev => prev.filter(r => r.id !== id))
  }

  const ft = useTableFilters(data, FILTER_CONFIG)

  const columns = [
    { key: 'fecha_registro', header: 'Fecha', sortable: true,
      render: v => <span className="text-slate-600 whitespace-nowrap">{formatDate(v)}</span> },
    { key: 'servicio', header: 'Servicio', sortable: true },
    { key: 'documento_identificacion', header: 'Documento', sortable: true },
    { key: 'criterio_1_cabecera',  header: 'Cabecera',   render: v => <BadgeSiNoNa v={v} /> },
    { key: 'criterio_2_higiene_oral', header: 'Hig. Oral', render: v => <BadgeSiNoNa v={v} /> },
    { key: 'criterio_3_implementos', header: 'Implementos', render: v => <BadgeSiNoNa v={v} /> },
    { key: 'criterio_4_lista_chequeo', header: 'Lista Chequeo', render: v => <BadgeSiNoNa v={v} /> },
    { key: 'criterio_5_presion_neumotaponador', header: 'Presión (22-30)',
      render: (v, row) => v == null
        ? <span className="text-slate-300">—</span>
        : (
          <span className={`inline-flex items-center gap-1 font-semibold ${row.criterio_5_fuera_rango ? 'text-red-600' : 'text-emerald-700'}`}
            title={row.criterio_5_fuera_rango ? 'Fuera del rango 22–30: cuenta como hallazgo (=1)' : 'Dentro del rango 22–30'}>
            {row.criterio_5_fuera_rango && <AlertTriangle className="w-3.5 h-3.5" />}
            {v}
          </span>
        ) },
    { key: 'criterio_6_interrupcion_sedacion', header: 'Interr. Sedación', render: v => <BadgeSiNoNa v={v} /> },
    { key: 'estado', header: 'Estado', sortable: true,
      render: v => <span className={`badge ${estadoBadgeColor(v)}`}>{estadoLabel(v)}</span> },
  ]

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/dashboard"
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
            <Wind className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h1 className="page-title">Adherencia Prevención NAV</h1>
            <p className="page-subtitle">Neumonía asociada a ventilación mecánica</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/encuestas/adherencia-prevencion-nav/dashboard" className="btn-secondary text-xs gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Dashboard
          </Link>
          {puedeCapturar && (
            <Link to="/encuestas/adherencia-prevencion-nav/nuevo" className="btn-primary text-xs gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Nuevo Registro
            </Link>
          )}
        </div>
      </div>

      <div className="card p-3 mb-4 bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          <strong>Criterio 5 — Presión del neumotaponador:</strong> el rango aceptable es 22–30. Valores
          <strong> menores a 22 o mayores a 30</strong> se resaltan en rojo y se contabilizan como hallazgo (=1)
          en la tabla y las gráficas del dashboard.
        </p>
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
            filename="adherencia_prevencion_nav"
            title="Adherencia Prevención NAV"
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
            searchPlaceholder="Buscar por servicio, documento..."
            emptyMessage="No hay registros de adherencia prevención NAV"
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
                  <Link to={`/encuestas/adherencia-prevencion-nav/${row.id}/editar`}
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
