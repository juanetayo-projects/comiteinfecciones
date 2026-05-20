import { Menu, LogOut, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export default function Header({ onMenuClick }) {
  const { user, profile, signOut } = useAuth()

  const displayName = profile?.nombre_completo ?? user?.email ?? 'Usuario'
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 flex-shrink-0">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        {/* Avatar + nombre */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-semibold text-indigo-700">
            {initials || <User className="w-3.5 h-3.5" />}
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-slate-700 leading-none">{displayName}</p>
            {profile?.rol && (
              <p className="text-[10px] text-slate-400 leading-tight capitalize">{profile.rol}</p>
            )}
          </div>
        </div>

        <button
          onClick={signOut}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  )
}
