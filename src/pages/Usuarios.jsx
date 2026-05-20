import { Users } from 'lucide-react'

export default function Usuarios() {
  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center">
          <Users className="w-5 h-5 text-teal-600" />
        </div>
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">Gestión de usuarios del sistema</p>
        </div>
      </div>
      <div className="card p-8 text-center text-slate-400">
        <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Módulo en construcción</p>
      </div>
    </div>
  )
}
