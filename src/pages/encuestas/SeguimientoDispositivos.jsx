import { Link } from 'react-router-dom'
import { Syringe, Droplets, Wind, ChevronRight, BarChart3 } from 'lucide-react'

const DISPOSITIVOS = [
  {
    to:          '/encuestas/acceso-venoso',
    icon:        Syringe,
    color:       'text-emerald-600',
    bg:          'bg-emerald-100',
    border:      'border-emerald-200',
    title:       'Acceso Venoso Periférico',
    subtitle:    'AVP — Vigilancia de catéteres periféricos',
    description: 'Seguimiento de criterios de inserción, fijación, rotulación, mantenimiento y pertinencia del acceso venoso periférico.',
  },
  {
    to:          '/encuestas/cateter-vesical',
    icon:        Droplets,
    color:       'text-blue-600',
    bg:          'bg-blue-100',
    border:      'border-blue-200',
    title:       'Catéter Vesical',
    subtitle:    'CV — Vigilancia de sondas vesicales',
    description: 'Control de fijación, posición de la bolsa, rotulación, indicación vigente, flujo continuo e irrigaciones.',
  },
  {
    to:          '/encuestas/prevencion-neumonia',
    icon:        Wind,
    color:       'text-violet-600',
    bg:          'bg-violet-100',
    border:      'border-violet-200',
    title:       'Prevención de Neumonía',
    subtitle:    'NAV — Neumonía asociada a ventilación',
    description: 'Verificación del paquete de medidas: cabecera elevada, higiene oral, implementos y lista de chequeo NAV.',
  },
]

export default function SeguimientoDispositivos() {
  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Seguimiento de Dispositivos</h1>
          <p className="page-subtitle mt-1">
            Vigilancia de dispositivos invasivos — selecciona el módulo a registrar
          </p>
        </div>
        <Link to="/encuestas/seguimiento-dispositivos/dashboard"
          className="btn-secondary text-xs gap-1.5">
          <BarChart3 className="w-3.5 h-3.5" /> Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {DISPOSITIVOS.map(d => {
          const Icon = d.icon
          return (
            <Link
              key={d.to}
              to={d.to}
              className={`card p-6 border-2 ${d.border} hover:shadow-md transition-all group`}
            >
              <div className={`w-12 h-12 rounded-xl ${d.bg} flex items-center justify-center mb-4`}>
                <Icon className={`w-6 h-6 ${d.color}`} />
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-1">{d.title}</h2>
              <p className={`text-xs font-semibold ${d.color} mb-3`}>{d.subtitle}</p>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">{d.description}</p>
              <div className={`flex items-center gap-1 text-sm font-medium ${d.color} group-hover:gap-2 transition-all`}>
                Ver registros <ChevronRight className="w-4 h-4" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
