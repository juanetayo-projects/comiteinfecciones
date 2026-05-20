import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { KeyRound, Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react'

export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password,      setPassword]      = useState('')
  const [confirm,       setConfirm]       = useState('')
  const [showPwd,       setShowPwd]       = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState('')
  const [success,       setSuccess]       = useState(false)
  const [sessionReady,  setSessionReady]  = useState(false)

  // Restaurar sesión desde el hash guardado por main.jsx antes de que
  // HashRouter pudiera destruirlo.
  useEffect(() => {
    async function initSession() {
      const storedHash = sessionStorage.getItem('supabase_recovery_hash')

      if (storedHash) {
        sessionStorage.removeItem('supabase_recovery_hash')
        const params     = new URLSearchParams(storedHash)
        const accessToken  = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token:  accessToken,
            refresh_token: refreshToken,
          })
          if (sessionError) {
            setError('El enlace de recuperación expiró o ya fue usado. Solicita uno nuevo desde el login.')
            return
          }
        }
      }

      setSessionReady(true)
    }

    initSession()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    const { error: err } = await updatePassword(password)
    if (err) {
      setError('Error al actualizar la contraseña. Intenta de nuevo.')
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 2500)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-4 shadow-lg">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Nueva Contraseña</h1>
          <p className="text-slate-400 text-sm mt-1">Elige una contraseña segura</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">

          {/* Enlace expirado */}
          {!sessionReady && error && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <p className="text-sm font-semibold text-red-600">Enlace inválido o expirado</p>
              <p className="text-sm text-slate-500">{error}</p>
              <button
                onClick={() => navigate('/login')}
                className="btn-primary mt-2 px-6 py-2"
              >
                Volver al login
              </button>
            </div>
          )}

          {/* Cargando sesión */}
          {!sessionReady && !error && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-sm text-slate-500">Verificando enlace...</p>
            </div>
          )}

          {/* Éxito */}
          {sessionReady && success && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-500" />
              <p className="text-base font-semibold text-slate-800">¡Contraseña actualizada!</p>
              <p className="text-sm text-slate-500">Redirigiendo al dashboard...</p>
            </div>
          )}

          {/* Formulario */}
          {sessionReady && !success && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="label">Nueva contraseña</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className="input pr-10"
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowPwd(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Confirmar contraseña</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Repite la contraseña"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Actualizando...
                  </span>
                ) : 'Guardar nueva contraseña'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  )
}
