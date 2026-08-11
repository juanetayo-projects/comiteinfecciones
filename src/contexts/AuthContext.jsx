import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,              setUser]              = useState(null)
  const [profile,           setProfile]           = useState(null)
  const [loading,           setLoading]           = useState(true)
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false)
  const [permisos,          setPermisos]          = useState([])

  useEffect(() => {
    // Sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) { fetchProfile(session.user.id); fetchPermisos() }
      else setLoading(false)
    })

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'PASSWORD_RECOVERY') {
        // El usuario llegó desde el link de recuperación de contraseña
        setNeedsPasswordReset(true)
        setLoading(false)
        return
      }
      if (session?.user) { fetchProfile(session.user.id); fetchPermisos() }
      else { setProfile(null); setPermisos([]); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  // Permisos configurables por rol/módulo (Configuración → Permisos).
  // No bloquea `loading`: si falla o tarda, puedeCapturar() usa su default seguro.
  async function fetchPermisos() {
    const { data } = await supabase.from('modulo_permisos').select('modulo, rol, puede_capturar')
    setPermisos(data ?? [])
  }

  // ¿El usuario actual puede capturar (crear) registros en este módulo?
  // Si el módulo no tiene fila configurada, se permite por defecto (fail-open,
  // igual que el comportamiento histórico antes de existir esta tabla).
  function puedeCapturar(modulo) {
    const fila = permisos.find(p => p.modulo === modulo && p.rol === rol)
    return fila ? fila.puede_capturar : true
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  // Envía el correo de recuperación. redirectTo = base URL sin hash:
  // main.jsx intercepta el token y redirige a #/reset-password.
  async function resetPasswordForEmail(email) {
    const redirectTo = window.location.href.split('#')[0]
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    return { error }
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (!error) setNeedsPasswordReset(false)
    return { error }
  }

  // Shorthand: 'administrador' | 'coordinador' | 'auxiliar'
  const rol = profile?.rol ?? 'auxiliar'

  const value = {
    user, profile, rol, loading, needsPasswordReset, permisos,
    signIn, signOut, updatePassword, resetPasswordForEmail,
    puedeCapturar, reloadPermisos: fetchPermisos,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
