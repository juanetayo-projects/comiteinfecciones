import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList,
  Kanban, BookOpen, FileBarChart2, Settings, X,
  ShieldAlert, Hand, Microscope, Stethoscope, Activity,
  ChevronDown, ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/utils'

const ENCUESTAS = [
  { to: '/encuestas/aislamiento',              label: 'Aislamiento',          icon: ShieldAlert, color: 'text-red-300'     },
  { to: '/encuestas/higiene-manos',            label: 'Higiene de Manos',     icon: Hand,        color: 'text-cyan-300'    },
  { to: '/encuestas/luminometria',             label: 'Luminometría',         icon: Microscope,  color: 'text-amber-300'   },
  { to: '/encuestas/ronda-cirugia',            label: 'Ronda de Cirugía',     icon: Stethoscope, color: 'text-purple-300'  },
  { to: '/encuestas/seguimiento-dispositivos', label: 'Seguimiento Disp.',    icon: Activity,    color: 'text-emerald-300' },
]

function NavItem({ to, icon: Icon, label, iconColor = 'text-white/70', end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
        isActive
          ? 'bg-white/20 text-white font-semibold'
          : 'text-white/80 hover:bg-white/10 hover:text-white'
      )}
    >
      <Icon className={cn('w-4 h-4 flex-shrink-0', iconColor)} />
      {label}
    </NavLink>
  )
}

export default function Sidebar({ open, onClose }) {
  const [encuestasOpen, setEncuestasOpen] = useState(true)

  return (
    <>
      {/* Overlay móvil */}
      {open && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={onClose} />
      )}

      <aside className={cn(
        'fixed top-0 left-0 h-full w-64 z-30',
        'flex flex-col transition-transform duration-200',
        'lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
        style={{ backgroundColor: '#1a4fa0' }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <img
              src="./logo_cacsb2.png"
              alt="Clínica Santa Bárbara"
              className="h-8 w-auto brightness-0 invert"
            />
            <div>
              <p className="text-xs font-bold text-white leading-tight">Comité de Infecciones</p>
              <p className="text-[10px] text-white/60 leading-tight">Clínica Santa Bárbara</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded text-white/60 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" iconColor="text-blue-200" end />

          {/* Encuestas (colapsable) */}
          <div>
            <button
              onClick={() => setEncuestasOpen(o => !o)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <ClipboardList className="w-4 h-4 text-white/70" />
                <span>Encuestas</span>
              </div>
              {encuestasOpen
                ? <ChevronDown  className="w-3.5 h-3.5 text-white/50" />
                : <ChevronRight className="w-3.5 h-3.5 text-white/50" />}
            </button>

            {encuestasOpen && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/20 pl-2">
                {ENCUESTAS.map(e => (
                  <NavItem key={e.to} to={e.to} icon={e.icon} label={e.label} iconColor={e.color} />
                ))}
              </div>
            )}
          </div>

          <NavItem to="/kanban"        icon={Kanban}        label="Tablero Kanban"  iconColor="text-violet-300" />
          <NavItem to="/registros"     icon={BookOpen}      label="Registros"       iconColor="text-white/70"   />
          <NavItem to="/reportes"      icon={FileBarChart2} label="Reportes"        iconColor="text-orange-300" />

          <div className="pt-2 border-t border-white/10 mt-2 space-y-0.5">
            <NavItem to="/configuracion" icon={Settings} label="Configuración" iconColor="text-teal-300" />
          </div>
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/10">
          <p className="text-[10px] text-white/40 text-center">v2.0 · 2025</p>
        </div>
      </aside>
    </>
  )
}
