import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, BarChart3,
  Kanban, BookOpen, FileBarChart2, Users, Settings, X,
  ShieldAlert, Hand, Microscope, Stethoscope, Activity,
  ChevronDown, ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '../../lib/utils'

const ENCUESTAS = [
  { to: '/encuestas/aislamiento',           label: 'Aislamiento',          icon: ShieldAlert,   color: 'text-red-500' },
  { to: '/encuestas/higiene-manos',         label: 'Higiene de Manos',     icon: Hand,          color: 'text-blue-500' },
  { to: '/encuestas/luminometria',          label: 'Luminometría',         icon: Microscope,    color: 'text-amber-500' },
  { to: '/encuestas/ronda-cirugia',         label: 'Ronda de Cirugía',     icon: Stethoscope,   color: 'text-purple-500' },
  { to: '/encuestas/seguimiento-dispositivos', label: 'Seguimiento Disp.', icon: Activity,      color: 'text-emerald-500' },
]

function NavItem({ to, icon: Icon, label, iconColor = 'text-slate-500', end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
        isActive
          ? 'bg-indigo-50 text-indigo-700 font-medium'
          : 'text-slate-600 hover:bg-slate-100'
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
        'fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-30',
        'flex flex-col transition-transform duration-200',
        'lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
          <div>
            <p className="text-sm font-bold text-slate-900 leading-tight">Comité de Infecciones</p>
            <p className="text-[10px] text-slate-400 leading-tight">Clínica Santa Bárbara</p>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" iconColor="text-indigo-500" end />

          {/* Encuestas (colapsable) */}
          <div>
            <button
              onClick={() => setEncuestasOpen(o => !o)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <ClipboardList className="w-4 h-4 text-slate-500" />
                <span>Encuestas</span>
              </div>
              {encuestasOpen
                ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
            </button>
            {encuestasOpen && (
              <div className="ml-4 mt-0.5 space-y-0.5 border-l border-slate-100 pl-2">
                {ENCUESTAS.map(e => (
                  <NavItem key={e.to} to={e.to} icon={e.icon} label={e.label} iconColor={e.color} />
                ))}
              </div>
            )}
          </div>

          <NavItem to="/kanban"    icon={Kanban}        label="Tablero Kanban"  iconColor="text-violet-500" />
          <NavItem to="/registros" icon={BookOpen}       label="Registros"       iconColor="text-slate-500" />
          <NavItem to="/reportes"  icon={FileBarChart2}  label="Reportes"        iconColor="text-orange-500" />

          <div className="pt-2 border-t border-slate-100 mt-2 space-y-0.5">
            <NavItem to="/usuarios"      icon={Users}    label="Usuarios"      iconColor="text-teal-500" />
            <NavItem to="/configuracion" icon={Settings} label="Configuración" iconColor="text-slate-400" />
          </div>
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 text-center">v2.0 · 2025</p>
        </div>
      </aside>
    </>
  )
}
