import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldOff } from 'lucide-react'

/**
 * Pantalla de bloqueo cuando el rol del usuario no tiene permiso para
 * capturar (crear) registros en un módulo, según `modulo_permisos`
 * (Configuración → Permisos).
 */
export default function SinPermisoCaptura({ volverTo, mensaje }) {
  return (
    <div className="p-6 lg:p-8 animate-fade-in max-w-2xl">
      <div className="card p-6 flex items-start gap-3">
        <div className="w-9 h-9 shrink-0 rounded-xl bg-amber-100 flex items-center justify-center">
          <ShieldOff className="w-4 h-4 text-amber-700" />
        </div>
        <div>
          <p className="text-sm font-bold text-amber-900">Sin permiso para crear este registro</p>
          <p className="text-xs text-amber-800 mt-1">
            {mensaje ?? 'Tu rol no tiene habilitada la captura en este módulo. Puedes consultar el listado y el dashboard. Si crees que deberías tener acceso, solicítalo al administrador en Configuración → Permisos.'}
          </p>
          <Link to={volverTo} className="btn-secondary text-xs mt-3 inline-flex">
            <ArrowLeft className="w-3.5 h-3.5" /> Volver al listado
          </Link>
        </div>
      </div>
    </div>
  )
}
