import { Settings } from 'lucide-react'

export default function Configuracion() {
  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
          <Settings className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-subtitle">Ajustes del sistema</p>
        </div>
      </div>
      <div className="card p-8 text-center text-slate-400">
        <Settings className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Módulo en construcción</p>
      </div>
    </div>
  )
}
