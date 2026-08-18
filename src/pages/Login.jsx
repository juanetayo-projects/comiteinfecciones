import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, Mail, ArrowLeft, MailCheck, KeyRound } from 'lucide-react'

export default function Login() {
  const { user, signIn, resetPasswordForEmail } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPwd,  setShowPwd]  = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  // Vista de recuperación de contraseña
  const [mode,        setMode]        = useState('login')   // 'login' | 'recover'
  const [recoverMail, setRecoverMail] = useState('')
  const [sending,     setSending]     = useState(false)
  const [sent,        setSent]        = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email, password)
    if (err) setError('Credenciales incorrectas. Verifica tu correo y contraseña.')
    setLoading(false)
  }

  function openRecover() {
    setError('')
    setSent(false)
    setRecoverMail(email)
    setMode('recover')
  }

  function backToLogin() {
    setError('')
    setSent(false)
    setMode('login')
  }

  async function handleRecover(e) {
    e.preventDefault()
    setError('')
    setSending(true)
    const { error: err } = await resetPasswordForEmail(recoverMail.trim())
    if (err) setError('No fue posible enviar el correo. Verifica la dirección e intenta de nuevo.')
    else     setSent(true)
    setSending(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ backgroundImage: 'linear-gradient(135deg, #0d2d6b 0%, #16468e 45%, #081c45 100%)' }}
    >
      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4 p-4 rounded-3xl bg-white/5">
            <img
              src="./logo_cacsb_blanc.png"
              alt="Clínica Santa Bárbara"
              className="h-16 w-auto"
            />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Comité de Infecciones</h1>
          <p className="text-accent-200 text-sm mt-1">Clínica de Alta Complejidad Santa Bárbara</p>
        </div>

        {/* ─────────── Iniciar sesión ─────────── */}
        {mode === 'login' && (
          <form
            onSubmit={handleSubmit}
            className="bg-neu-surface rounded-3xl border border-white/70 p-6 space-y-4"
          >
            <h2 className="text-base font-bold text-brand-900 mb-2">Iniciar Sesión</h2>

            {error && (
              <div className="rounded-xl px-3 py-2 text-sm text-rose-700 bg-rose-50 shadow-neu-in-xs">
                {error}
              </div>
            )}

            <div>
              <label className="label">Correo electrónico</label>
              <input
                type="email"
                className="input"
                placeholder="usuario@cacsantabarbara.co"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Contraseña</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  className="input pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-600 transition-colors"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verificando...
                </span>
              ) : 'Ingresar'}
            </button>

            <button
              type="button"
              onClick={openRecover}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors pt-1"
            >
              <KeyRound className="w-3.5 h-3.5" />
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        )}

        {/* ─────────── Recuperar contraseña ─────────── */}
        {mode === 'recover' && (
          <div className="bg-neu-surface rounded-3xl border border-white/70 p-6">
            {sent ? (
              <div className="flex flex-col items-center gap-3 py-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-neu-base shadow-neu-in flex items-center justify-center">
                  <MailCheck className="w-7 h-7 text-emerald-600" />
                </div>
                <p className="text-base font-bold text-brand-900">Correo enviado</p>
                <p className="text-sm text-slate-600">
                  Enviamos un enlace de recuperación a <span className="font-semibold text-brand-700">{recoverMail}</span>.
                  Revisa tu bandeja de entrada (y la carpeta de spam). El enlace caduca en 1 hora.
                </p>
                <button onClick={backToLogin} className="btn-secondary mt-2 justify-center w-full py-2.5">
                  <ArrowLeft className="w-4 h-4" /> Volver al inicio de sesión
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecover} className="space-y-4">
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-9 h-9 rounded-xl bg-neu-base shadow-neu-in flex items-center justify-center">
                    <Mail className="w-4 h-4 text-brand-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-brand-900 leading-tight">Recuperar contraseña</h2>
                    <p className="text-xs text-slate-500">Te enviaremos un enlace seguro</p>
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl px-3 py-2 text-sm text-rose-700 bg-rose-50 shadow-neu-in-xs">
                    {error}
                  </div>
                )}

                <div>
                  <label className="label">Correo electrónico</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="usuario@cacsantabarbara.co"
                    value={recoverMail}
                    onChange={e => setRecoverMail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <button type="submit" disabled={sending} className="btn-primary w-full justify-center py-2.5">
                  {sending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </span>
                  ) : 'Enviar enlace de recuperación'}
                </button>

                <button
                  type="button"
                  onClick={backToLogin}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-brand-700 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Volver al inicio de sesión
                </button>
              </form>
            )}
          </div>
        )}

        <p className="text-center text-white/50 text-xs mt-6">
          © 2025 Clínica Santa Bárbara · Sistema Interno
        </p>
      </div>
    </div>
  )
}
