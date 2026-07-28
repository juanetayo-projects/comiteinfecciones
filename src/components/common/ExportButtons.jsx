import { useState } from 'react'
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { exportToExcel, exportToPDF } from '../../lib/exportUtils'

/**
 * Botones de exportación de una vista de tabla.
 *
 * `filtros` es el resumen legible de los filtros aplicados (ver
 * `useTableFilters().summary`): se imprime en el encabezado del Excel y del PDF
 * para que quede constancia de qué subconjunto se exportó.
 */
export default function ExportButtons({
  data, columns, filename, title, subtitle, kpis, filtros = [],
}) {
  const [busy,  setBusy]  = useState('')
  const [error, setError] = useState('')

  async function run(tipo, fn) {
    setBusy(tipo)
    setError('')
    try {
      await fn()
    } catch (e) {
      console.error(`Error exportando a ${tipo}:`, e)
      setError(`No se pudo generar el ${tipo}`)
    } finally {
      setBusy('')
    }
  }

  const subtituloConFiltros = filtros.length
    ? `${subtitle ? subtitle + ' — ' : ''}Filtros: ${filtros.join(' · ')}`
    : subtitle

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-rose-600 font-medium">{error}</span>}

      <button
        disabled={!!busy}
        onClick={() => run('Excel', () =>
          exportToExcel(data, columns, filename, title, subtitle, filtros))}
        className="btn-secondary text-xs gap-1.5"
      >
        {busy === 'Excel'
          ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
          : <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
        Excel
      </button>

      <button
        disabled={!!busy}
        onClick={() => run('PDF', () =>
          exportToPDF(data, columns, filename, title, subtituloConFiltros, kpis))}
        className="btn-secondary text-xs gap-1.5"
      >
        {busy === 'PDF'
          ? <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
          : <FileText className="w-3.5 h-3.5 text-rose-600" />}
        PDF
      </button>
    </div>
  )
}
