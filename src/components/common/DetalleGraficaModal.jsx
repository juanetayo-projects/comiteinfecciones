import { X, ListFilter } from 'lucide-react'
import { formatDate, estadoBadgeColor, estadoLabel } from '../../lib/utils'

/**
 * Detalle de las encuestas que componen un valor de una gráfica.
 *
 * Al pulsar un segmento o una barra se abre esta tabla con los registros que
 * hay detrás de ese número, para poder pasar del dato agregado al caso concreto.
 *
 * @param {object|null} detalle  { titulo, subtitulo, rows } — null cierra el modal
 * @param {Array}  columnas      [{ key, header, render? }]
 */
export default function DetalleGraficaModal({ detalle, columnas, onClose }) {
  if (!detalle) return null
  const { titulo, subtitulo, rows = [] } = detalle

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/40 backdrop-blur-sm"
      onClick={onClose}>
      <div
        className="bg-neu-surface rounded-3xl shadow-neu-lg border border-white/70 w-full max-w-5xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Cabecera */}
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-white/70">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-brand-gradient shadow-neu-xs flex items-center justify-center">
              <ListFilter className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-brand-900 truncate">{titulo}</h3>
              {subtitulo && <p className="text-xs text-slate-500 mt-0.5">{subtitulo}</p>}
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-white/70 transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabla */}
        <div className="overflow-auto p-5">
          {rows.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              No hay registros para este valor
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0">
                <tr className="table-head-brand">
                  {columnas.map((c, i) => (
                    <th key={c.key}
                      className={`text-left px-2.5 py-2 font-semibold whitespace-nowrap
                        ${i === 0 ? 'rounded-tl-md' : ''}
                        ${i === columnas.length - 1 ? 'rounded-tr-md' : ''}`}>
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id ?? i}
                    className={`border-b border-white/70 ${i % 2 === 1 ? 'bg-white/55' : ''} hover:bg-brand-50 transition-colors`}>
                    {columnas.map(c => (
                      <td key={c.key} className="px-2.5 py-1.5 text-slate-700 align-top">
                        {c.render ? c.render(r[c.key], r) : (r[c.key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="px-5 py-3 border-t border-white/70 flex items-center justify-between">
          <span className="text-xs text-slate-500">{rows.length} registro(s)</span>
          <button onClick={onClose} className="btn-secondary text-xs">Cerrar</button>
        </div>
      </div>
    </div>
  )
}

/** Columnas de uso frecuente para el detalle */
export const COL_FECHA = {
  key: 'fecha_registro', header: 'Fecha',
  render: v => <span className="whitespace-nowrap">{formatDate(v)}</span>,
}
export const COL_ESTADO = {
  key: 'estado', header: 'Estado',
  render: v => <span className={`badge ${estadoBadgeColor(v)}`}>{estadoLabel(v)}</span>,
}
export const colCumple = (key, header = 'Resultado') => ({
  key, header,
  render: v => (
    <span className={`badge ${v === 'CUMPLE'
      ? 'bg-emerald-100 text-emerald-800'
      : v ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600'}`}>
      {v ?? '—'}
    </span>
  ),
})
