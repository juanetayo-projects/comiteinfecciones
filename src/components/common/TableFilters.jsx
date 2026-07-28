import { useMemo, useState } from 'react'
import { Filter, X } from 'lucide-react'

/**
 * Filtros reutilizables para las vistas de tabla de las encuestas.
 *
 * Config de cada campo:
 *   { key: 'servicio', label: 'Servicio', type: 'select' }        → select con las
 *        opciones únicas presentes en los datos
 *   { key: 'adherencia', label: 'Adherencia', type: 'select',
 *     options: ['CUMPLE','NO CUMPLE'] }                            → opciones fijas
 *   { key: 'estado', label: 'Estado', type: 'select',
 *     options: [{ value:'pendiente', label:'Pendiente' }] }        → value/label
 *   { key: 'fecha_registro', label: 'Fecha', type: 'daterange' }   → dos inputs date
 *
 * Devuelve `filtered` ya filtrado para pasarlo tanto a <DataTable> como a
 * <ExportButtons>, de modo que lo exportado sea exactamente lo que se ve.
 */
export function useTableFilters(data, config) {
  const [values, setValues] = useState({})

  // Opciones únicas por campo, calculadas sobre el dataset completo
  const options = useMemo(() => {
    const out = {}
    config.forEach(f => {
      if (f.type !== 'select') return
      if (f.options) {
        out[f.key] = f.options.map(o =>
          typeof o === 'string' ? { value: o, label: o } : o
        )
      } else {
        out[f.key] = [...new Set(data.map(r => r[f.key]).filter(v => v != null && v !== ''))]
          .sort((a, b) => String(a).localeCompare(String(b), 'es'))
          .map(v => ({ value: v, label: String(v) }))
      }
    })
    return out
  }, [data, config])

  const filtered = useMemo(() => {
    return data.filter(row =>
      config.every(f => {
        if (f.type === 'daterange') {
          const desde = values[`${f.key}__desde`]
          const hasta = values[`${f.key}__hasta`]
          const v = row[f.key]
          if (desde && (!v || v < desde)) return false
          if (hasta && (!v || v > hasta)) return false
          return true
        }
        const sel = values[f.key]
        if (!sel) return true
        return String(row[f.key] ?? '') === String(sel)
      })
    )
  }, [data, config, values])

  const active = Object.entries(values).filter(([, v]) => v)
  const hasFilters = active.length > 0

  function setF(key, val) { setValues(prev => ({ ...prev, [key]: val })) }
  function clear() { setValues({}) }

  /** Resumen legible de los filtros aplicados — se usa en el PDF */
  const summary = useMemo(() => {
    return config.flatMap(f => {
      if (f.type === 'daterange') {
        const d = values[`${f.key}__desde`], h = values[`${f.key}__hasta`]
        if (!d && !h) return []
        if (d && h)   return [`${f.label}: ${d} a ${h}`]
        return [d ? `${f.label} desde: ${d}` : `${f.label} hasta: ${h}`]
      }
      const v = values[f.key]
      if (!v) return []
      const opt = (options[f.key] ?? []).find(o => String(o.value) === String(v))
      return [`${f.label}: ${opt?.label ?? v}`]
    })
  }, [config, values, options])

  return { values, setF, clear, filtered, options, hasFilters, summary }
}

export default function TableFilters({ config, values, setF, clear, options, hasFilters, total, shown }) {
  // Un rango de fechas ocupa dos columnas (desde / hasta)
  const cols = config.reduce((n, f) => n + (f.type === 'daterange' ? 2 : 1), 0)

  return (
    <div className="neu-inset p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-brand-600" />
        <span className="text-sm font-semibold text-brand-800">Filtros</span>
        {hasFilters && (
          <>
            <span className="text-xs text-brand-600 font-medium ml-2">
              {shown} de {total} registros
            </span>
            <button onClick={clear}
              className="ml-auto flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors">
              <X className="w-3 h-3" /> Limpiar filtros
            </button>
          </>
        )}
      </div>

      <div className="filters-row" style={{ '--cols': cols }}>
        {config.map(f => f.type === 'daterange' ? (
          <FilterDateRange key={f.key} field={f} values={values} setF={setF} />
        ) : (
          <div key={f.key}>
            <label title={f.label}>{f.label}</label>
            <select className="input"
              value={values[f.key] ?? ''}
              onChange={e => setF(f.key, e.target.value)}>
              <option value="">Todos</option>
              {(options[f.key] ?? []).map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}

function FilterDateRange({ field, values, setF }) {
  return (
    <>
      <div>
        <label title={`${field.label} desde`}>{field.label} desde</label>
        <input type="date" className="input"
          value={values[`${field.key}__desde`] ?? ''}
          onChange={e => setF(`${field.key}__desde`, e.target.value)} />
      </div>
      <div>
        <label title={`${field.label} hasta`}>{field.label} hasta</label>
        <input type="date" className="input"
          value={values[`${field.key}__hasta`] ?? ''}
          onChange={e => setF(`${field.key}__hasta`, e.target.value)} />
      </div>
    </>
  )
}
