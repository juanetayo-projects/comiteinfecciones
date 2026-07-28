import { Lock } from 'lucide-react'
import { estadoLabel } from '../../lib/utils'

/**
 * Aviso de que el registro está cerrado a edición.
 *
 * Un registro en estado "validado" o "cerrado" queda en solo lectura: es el
 * cierre documental de la encuesta. Sólo el administrador puede reabrirlo para
 * corregir errores.
 */
export default function BannerSoloLectura({ estado }) {
  return (
    <div className="rounded-2xl bg-amber-50 shadow-neu-in-xs border border-amber-200/70 px-4 py-3 flex items-start gap-3">
      <div className="w-9 h-9 shrink-0 rounded-xl bg-amber-100 shadow-neu-xs flex items-center justify-center">
        <Lock className="w-4 h-4 text-amber-700" />
      </div>
      <div>
        <p className="text-sm font-bold text-amber-900">
          Registro en solo lectura — {estadoLabel(estado)}
        </p>
        <p className="text-xs text-amber-800 mt-0.5">
          Esta encuesta ya fue {estadoLabel(estado).toLowerCase()}, por lo que sus datos
          no pueden modificarse. Si necesitas corregir algo, solicítalo al administrador.
        </p>
      </div>
    </div>
  )
}
