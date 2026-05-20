import { BookOpen } from 'lucide-react'

export default function Registros() {
  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h1 className="page-title">Registros</h1>
          <p className="page-subtitle">Historial consolidado de todas las encuestas</p>
        </div>
      </div>
      <div className="card p-8 text-center text-slate-400">
        <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">Módulo en construcción</p>
      </div>
    </div>
  )
}
