import { Menu, LogOut, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function Header({ onMenuClick }) {
  const { user, profile, signOut } = useAuth()

  const displayName = profile?.nombre_completo ?? user?.email ?? 'Usuario'
  const role        = profile?.rol ?? ''

  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <header
      className="h-14 flex items-center justify-between px-4 flex-shrink-0 border-b border-white/10 shadow-[0_10px_24px_-14px_rgba(13,45,107,0.75)] relative z-10"
      style={{ backgroundImage: 'linear-gradient(120deg, #1a4fa0 0%, #1f56c4 50%, #0d2d6b 100%)' }}
    >
      {/* Botón menú móvil */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-white/70 hover:bg-white/10 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="hidden lg:block" />

      {/* Derecha: usuario + salir */}
      <div className="flex items-center gap-3">
        {/* Avatar + nombre */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-accent-gradient flex items-center justify-center text-xs font-bold text-white shadow-neu-dark ring-2 ring-white/25">
            {initials || <User className="w-3.5 h-3.5 text-white" />}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-white leading-none">{displayName}</p>
            {role && (
              <p className="text-[10px] text-white/60 leading-tight capitalize">{role}</p>
            )}
          </div>
        </div>

        {/* Separador */}
        <div className="w-px h-5 bg-white/20" />

        {/* Salir */}
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-white/85 hover:text-white hover:bg-white/10 hover:shadow-neu-dark rounded-xl transition-all duration-200"
          title="Cerrar sesión"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  )
}
