import { useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'
import { exportDashboardToPDF } from '../../lib/exportUtils'

/**
 * Botón "Exportar PDF" para los dashboards.
 *
 * Captura el nodo referenciado por `targetRef` tal como se ve en pantalla
 * (colores, gráficas y tablas incluidas) y lo antepone con el encabezado
 * institucional, el título y el resumen de filtros aplicados.
 *
 * Los elementos marcados con `data-pdf-hide` se omiten de la captura.
 */
export default function DashboardPdfButton({ targetRef, filename, title, subtitle, filtros = [] }) {
  const [busy,  setBusy]  = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    setBusy(true)
    setError('')
    try {
      await exportDashboardToPDF(targetRef.current, { filename, title, subtitle, filtros })
    } catch (e) {
      console.error('Error exportando el dashboard a PDF:', e)
      setError('No se pudo generar el PDF')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-rose-600 font-medium">{error}</span>}
      <button onClick={handleClick} disabled={busy} className="btn-secondary text-xs gap-1.5">
        {busy
          ? <><Loader2 className="w-3.5 h-3.5 animate-spin text-brand-600" /> Generando…</>
          : <><FileText className="w-3.5 h-3.5 text-rose-600" /> Exportar PDF</>}
      </button>
    </div>
  )
}
