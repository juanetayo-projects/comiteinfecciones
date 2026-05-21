import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { BookOpen, Filter, X, Pencil } from 'lucide-react'

// ── Configuración de tipos ────────────────────────────────────────
const AVP_KEYS = ['criterio_1_rotulo','criterio_2_fijacion','criterio_3_mantenimiento','criterio_4_pertinencia','criterio_5_educacion']
const CV_KEYS  = ['criterio_1_fijacion','criterio_2_posicion_bolsa','criterio_3_rotulacion','criterio_4_indicacion','criterio_5_flujo_continuo','criterio_6_lista_chequeo_sonda']
const PN_KEYS  = ['criterio_1_cabecera','criterio_2_higiene_oral','criterio_3_implementos','criterio_4_lista_chequeo_nav']

const TIPOS_CFG = [
  {
    key:'ais', label:'Aislamiento',        color:'blue',
    table:'encuesta_aislamiento',       dateField:'fecha_registro',
    editPath: id => `/encuestas/aislamiento/${id}/editar`,
    getServicio: r => r.servicio,
    getSujeto:   r => r.nombre_evaluado || '',
    getResultado: r => r.adherencia || '',
  },
  {
    key:'hig', label:'Higiene de Manos',   color:'emerald',
    table:'encuesta_higiene_manos',     dateField:'fecha_evaluacion',
    editPath: id => `/encuestas/higiene-manos/${id}/editar`,
    getServicio: r => r.servicio_evaluado,
    getSujeto:   r => r.nombre_evaluado || '',
    getResultado: r => r.resultado_cumplimiento || '',
  },
  {
    key:'lum', label:'Luminometría',       color:'amber',
    table:'encuesta_luminometria',      dateField:'fecha_registro',
    editPath: id => `/encuestas/luminometria/${id}/editar`,
    getServicio: r => r.servicio_evaluado,
    getSujeto:   r => r.objeto || '',
    getResultado: r => r.rango || '',
  },
  {
    key:'ron', label:'Ronda Cirugía',      color:'purple',
    table:'encuesta_ronda_cirugia',     dateField:'fecha_registro',
    editPath: id => `/encuestas/ronda-cirugia/${id}/editar`,
    getServicio: r => r.servicio,
    getSujeto:   r => r.especialidad || '',
    getResultado: r => r.cumplimiento_profilaxis || '',
  },
  {
    key:'avp', label:'Acceso Venoso',      color:'indigo',
    table:'encuesta_acceso_venoso',     dateField:'fecha_registro',
    editPath: id => `/encuestas/acceso-venoso/${id}/editar`,
    getServicio: r => r.ubicacion_cama,
    getSujeto:   r => r.nombre_paciente || '',
    getResultado: r => {
      const c = AVP_KEYS.filter(k => r[k] === true).length
      return `${c}/${AVP_KEYS.length} criterios`
    },
  },
  {
    key:'cv', label:'Catéter Vesical',     color:'cyan',
    table:'encuesta_cateter_vesical',   dateField:'fecha_registro',
    editPath: id => `/encuestas/cateter-vesical/${id}/editar`,
    getServicio: r => r.ubicacion_cama,
    getSujeto:   r => r.nombre_paciente || '',
    getResultado: r => {
      const c = CV_KEYS.filter(k => r[k] === true).length
      return `${c}/${CV_KEYS.length} criterios`
    },
  },
  {
    key:'pn', label:'Prevención NAV',      color:'violet',
    table:'encuesta_prevencion_neumonia',dateField:'fecha_registro',
    editPath: id => `/encuestas/prevencion-neumonia/${id}/editar`,
    getServicio: r => r.ubicacion_cama,
    getSujeto:   r => r.nombre_paciente || '',
    getResultado: r => {
      const c = PN_KEYS.filter(k => r[k] === true).length
      return `${c}/${PN_KEYS.length} criterios`
    },
  },
]

// ── Badge helpers ─────────────────────────────────────────────────
const TIPO_BADGE = {
  blue:   'bg-blue-100   text-blue-700',
  emerald:'bg-emerald-100 text-emerald-700',
  amber:  'bg-amber-100  text-amber-700',
  purple: 'bg-purple-100 text-purple-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  cyan:   'bg-cyan-100   text-cyan-700',
  violet: 'bg-violet-100 text-violet-700',
}
const ESTADO_BADGE = {
  pendiente:  'bg-yellow-100 text-yellow-700',
  en_proceso: 'bg-blue-100   text-blue-700',
  validado:   'bg-emerald-100 text-emerald-700',
  cerrado:    'bg-slate-100  text-slate-600',
}

function resultadoBadge(v) {
  if (!v) return null
  if (v === 'CUMPLE')    return 'bg-emerald-100 text-emerald-700'
  if (v === 'NO CUMPLE') return 'bg-red-100     text-red-700'
  return 'bg-slate-100 text-slate-600'
}

// ── Normalizar fila ───────────────────────────────────────────────
function normalize(row, cfg) {
  const fecha = row[cfg.dateField] || ''
  return {
    id:          row.id,
    tipo:        cfg.key,
    tipoLabel:   cfg.label,
    color:       cfg.color,
    fecha:       typeof fecha === 'string' ? fecha.slice(0,10) : new Date(fecha).toISOString().slice(0,10),
    servicio:    cfg.getServicio(row) || '',
    sujeto:      cfg.getSujeto(row),
    resultado:   cfg.getResultado(row),
    estado:      row.estado || 'pendiente',
    editPath:    cfg.editPath(row.id),
  }
}

// ── Filtros ───────────────────────────────────────────────────────
const INIT_FILTERS = { tipo:'', desde:'', hasta:'', estado:'' }

// ── Componente ────────────────────────────────────────────────────
export default function Registros() {
  const [allRows, setAllRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState(INIT_FILTERS)

  useEffect(() => {
    Promise.all(
      TIPOS_CFG.map(cfg =>
        supabase.from(cfg.table).select('*')
          .order(cfg.dateField, { ascending: false })
          .limit(100)
      )
    ).then(results => {
      const combined = []
      results.forEach((res, i) => {
        ;(res.data ?? []).forEach(row => combined.push(normalize(row, TIPOS_CFG[i])))
      })
      combined.sort((a, b) => b.fecha.localeCompare(a.fecha))
      setAllRows(combined)
      setLoading(false)
    })
  }, [])

  const filtered = useMemo(() => {
    return allRows.filter(r => {
      if (filters.tipo   && r.tipo   !== filters.tipo)   return false
      if (filters.desde  && r.fecha  <  filters.desde)   return false
      if (filters.hasta  && r.fecha  >  filters.hasta)   return false
      if (filters.estado && r.estado !== filters.estado) return false
      return true
    })
  }, [allRows, filters])

  const hasFilters = Object.values(filters).some(Boolean)
  function clearFilters() { setFilters(INIT_FILTERS) }
  function setF(k, v) { setFilters(prev => ({ ...prev, [k]: v })) }

  if (loading) return (
    <div className="p-8 flex justify-center">
      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-6 lg:p-8 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h1 className="page-title">Registros</h1>
          <p className="page-subtitle">Historial consolidado de todas las encuestas — últimos 100 por tipo</p>
        </div>
      </div>

      {/* Resumen por tipo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-6">
        {TIPOS_CFG.map(cfg => {
          const count = allRows.filter(r => r.tipo === cfg.key).length
          return (
            <button key={cfg.key}
              onClick={() => setF('tipo', filters.tipo === cfg.key ? '' : cfg.key)}
              className={`card p-3 text-center transition-all cursor-pointer border-2
                ${filters.tipo === cfg.key
                  ? 'border-indigo-400 bg-indigo-50'
                  : 'border-transparent hover:border-slate-200'}`}>
              <p className="text-xl font-bold text-slate-800">{count}</p>
              <p className={`text-xs font-medium mt-0.5 px-1.5 py-0.5 rounded-full ${TIPO_BADGE[cfg.color]}`}>
                {cfg.label}
              </p>
            </button>
          )
        })}
      </div>

      {/* Filtros */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Filtros</span>
          {hasFilters && (
            <button onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-red-600 transition-colors">
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Tipo</label>
            <select className="input text-sm" value={filters.tipo} onChange={e => setF('tipo', e.target.value)}>
              <option value="">Todos</option>
              {TIPOS_CFG.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Desde</label>
            <input type="date" className="input text-sm"
              value={filters.desde} onChange={e => setF('desde', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Hasta</label>
            <input type="date" className="input text-sm"
              value={filters.hasta} onChange={e => setF('hasta', e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Estado</label>
            <select className="input text-sm" value={filters.estado} onChange={e => setF('estado', e.target.value)}>
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_proceso">En Proceso</option>
              <option value="validado">Validado</option>
              <option value="cerrado">Cerrado</option>
            </select>
          </div>
        </div>
        {hasFilters && (
          <p className="text-xs text-indigo-600 mt-2">{filtered.length} de {allRows.length} registros mostrados</p>
        )}
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="card p-8 text-center text-slate-400">
          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No hay registros para los filtros seleccionados</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Tipo</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Servicio / Ubicación</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Evaluado / Objeto</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Resultado</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Estado</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${TIPO_BADGE[r.color]}`}>
                        {r.tipoLabel}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500 whitespace-nowrap">{r.fecha}</td>
                    <td className="px-4 py-2.5 text-slate-700 max-w-[180px] truncate">{r.servicio || '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600 max-w-[180px] truncate">{r.sujeto || '—'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {r.resultado ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold
                          ${resultadoBadge(r.resultado)}`}>
                          {r.resultado}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-center whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold
                        ${ESTADO_BADGE[r.estado] || 'bg-slate-100 text-slate-600'}`}>
                        {r.estado?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Link to={r.editPath}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors inline-flex"
                        title="Editar registro">
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 text-right">
            Mostrando {filtered.length} registros
          </div>
        </div>
      )}
    </div>
  )
}
