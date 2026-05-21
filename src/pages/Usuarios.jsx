import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Users, Plus, Pencil, Trash2, X, Save, ShieldCheck,
  User, Mail, Lock, AlertCircle, CheckCircle2,
} from 'lucide-react'

const ROLES = ['administrador', 'coordinador', 'auxiliar']

const ROLE_BADGE = {
  administrador: 'bg-indigo-100 text-indigo-700',
  coordinador:   'bg-blue-100   text-blue-700',
  auxiliar:      'bg-slate-100  text-slate-600',
}

const ROLE_LABEL = {
  administrador: 'Administrador',
  coordinador:   'Coordinador',
  auxiliar:      'Auxiliar',
}

function SH({ children }) {
  return (
    <div className="px-3 py-2 bg-slate-700 border-l-4 border-indigo-400 rounded-r-md mb-4">
      <h3 className="text-sm font-semibold text-white tracking-wide">{children}</h3>
    </div>
  )
}

// ── Modal para crear/editar perfil ────────────────────────────
function ProfileModal({ profile, onClose, onSaved }) {
  const isEdit = Boolean(profile?.id)
  const [form, setForm] = useState({
    nombre:    profile?.nombre    ?? '',
    email:     profile?.email     ?? '',
    rol:       profile?.rol       ?? 'auxiliar',
    activo:    profile?.activo    ?? true,
    password:  '',
  })
  const [saving, setSaving]   = useState(false)
  const [error,  setError]    = useState('')

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      if (isEdit) {
        // Update existing profile
        const update = { nombre: form.nombre, rol: form.rol, activo: form.activo }
        const { error: err } = await supabase
          .from('user_profiles')
          .update(update)
          .eq('id', profile.id)
        if (err) throw err
        // If password provided, update via auth (only works if allowed)
        if (form.password) {
          const { error: pwErr } = await supabase.auth.admin?.updateUserById?.(profile.id, { password: form.password }) ?? {}
          if (pwErr) console.warn('Password update requires admin key:', pwErr.message)
        }
        onSaved({ ...profile, ...update })
      } else {
        // Create new user via signUp
        if (!form.email || !form.password) throw new Error('Email y contraseña son requeridos')
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email:    form.email,
          password: form.password,
        })
        if (signUpErr) throw signUpErr
        const uid = signUpData?.user?.id
        if (!uid) throw new Error('No se pudo obtener el ID del usuario')
        // Create profile record
        const { error: profErr } = await supabase.from('user_profiles').upsert({
          id:     uid,
          nombre: form.nombre,
          rol:    form.rol,
          activo: form.activo,
        })
        if (profErr) throw profErr
        onSaved({ id: uid, nombre: form.nombre, email: form.email, rol: form.rol, activo: form.activo })
      }
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
              <User className="w-4 h-4 text-teal-600" />
            </div>
            <h2 className="font-semibold text-slate-800">{isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <SH>Información del Usuario</SH>

          <div>
            <label className="label">Nombre Completo *</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input className="input pl-9" placeholder="Nombre del colaborador"
                value={form.nombre} onChange={e => setF('nombre', e.target.value)} />
            </div>
          </div>

          {!isEdit && (
            <div>
              <label className="label">Correo Electrónico *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input type="email" className="input pl-9" placeholder="usuario@hospital.com"
                  value={form.email} onChange={e => setF('email', e.target.value)} />
              </div>
            </div>
          )}

          <div>
            <label className="label">{isEdit ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input type="password" className="input pl-9" placeholder={isEdit ? '••••••••' : 'Mínimo 6 caracteres'}
                value={form.password} onChange={e => setF('password', e.target.value)} />
            </div>
            {isEdit && <p className="text-xs text-slate-400 mt-1">El cambio de contraseña requiere permisos de administrador Supabase</p>}
          </div>

          <div>
            <label className="label">Rol *</label>
            <div className="flex gap-3 mt-1">
              {ROLES.map(r => (
                <button key={r} type="button"
                  onClick={() => setF('rol', r)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-colors ${
                    form.rol === r
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}>
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600"
              checked={form.activo} onChange={e => setF('activo', e.target.checked)} />
            <span className="text-sm text-slate-700">Usuario activo</span>
          </label>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando...</>
              : <><Save className="w-4 h-4" /> {isEdit ? 'Actualizar' : 'Crear Usuario'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export default function Usuarios() {
  const { rol: rolActual } = useAuth()
  const [profiles,  setProfiles]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(null)   // null | 'nuevo' | profile-object
  const [confirm,   setConfirm]   = useState(null)   // id to delete
  const [toast,     setToast]     = useState('')

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  useEffect(() => { loadProfiles() }, [])

  async function loadProfiles() {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, nombre, rol, activo, created_at')
      .order('nombre')
    setProfiles(data ?? [])
    setLoading(false)
  }

  async function handleDelete(id) {
    // Soft-delete: set activo = false
    const { error } = await supabase
      .from('user_profiles')
      .update({ activo: false })
      .eq('id', id)
    if (error) { showToast('Error al desactivar usuario'); return }
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, activo: false } : p))
    setConfirm(null)
    showToast('Usuario desactivado')
  }

  async function handleActivar(id) {
    const { error } = await supabase
      .from('user_profiles')
      .update({ activo: true })
      .eq('id', id)
    if (error) { showToast('Error al activar usuario'); return }
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, activo: true } : p))
    showToast('Usuario activado')
  }

  function onSaved(updated) {
    setProfiles(prev => {
      const exists = prev.find(p => p.id === updated.id)
      if (exists) return prev.map(p => p.id === updated.id ? { ...p, ...updated } : p)
      return [...prev, updated]
    })
    showToast('Usuario guardado correctamente')
  }

  const activos  = profiles.filter(p => p.activo !== false)
  const inactivos = profiles.filter(p => p.activo === false)

  if (rolActual !== 'administrador') {
    return (
      <div className="p-6 lg:p-8 animate-fade-in">
        <div className="card p-8 text-center text-slate-400">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Acceso restringido</p>
          <p className="text-xs mt-1">Solo los administradores pueden gestionar usuarios</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-xl shadow-lg text-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h1 className="page-title">Usuarios</h1>
            <p className="page-subtitle">Gestión de usuarios y perfiles del sistema · {activos.length} activos</p>
          </div>
        </div>
        <button onClick={() => setModal('nuevo')} className="btn-primary text-xs gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Nuevo Usuario
        </button>
      </div>

      {/* Resumen por roles */}
      <div className="grid grid-cols-3 gap-3">
        {ROLES.map(r => {
          const count = activos.filter(p => p.rol === r).length
          return (
            <div key={r} className="card p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">{count}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE[r]}`}>
                {ROLE_LABEL[r]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Tabla usuarios activos */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-700 text-sm">Usuarios Activos</span>
          <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{activos.length}</span>
        </div>

        {loading ? (
          <div className="flex justify-center p-8">
            <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activos.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No hay usuarios activos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="text-left px-4 py-3 font-semibold text-xs rounded-tl-none">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs">ID / UUID</th>
                  <th className="text-center px-4 py-3 font-semibold text-xs">Rol</th>
                  <th className="text-center px-4 py-3 font-semibold text-xs rounded-tr-none">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {activos.map((p, i) => (
                  <tr key={p.id} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50' : ''} hover:bg-teal-50 transition-colors`}>
                    <td className="px-4 py-3 font-medium text-slate-700">{p.nombre || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs truncate max-w-[180px]">{p.id}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE[p.rol] ?? 'bg-slate-100 text-slate-600'}`}>
                        {ROLE_LABEL[p.rol] ?? p.rol}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setModal(p)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors"
                          title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirm(p.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                          title="Desactivar">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Usuarios inactivos (colapsable) */}
      {inactivos.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="font-semibold text-slate-500 text-sm">Usuarios Inactivos</span>
            <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{inactivos.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-500">
                  <th className="text-left px-4 py-2.5 font-semibold text-xs">Nombre</th>
                  <th className="text-center px-4 py-2.5 font-semibold text-xs">Rol</th>
                  <th className="text-center px-4 py-2.5 font-semibold text-xs">Acción</th>
                </tr>
              </thead>
              <tbody>
                {inactivos.map((p, i) => (
                  <tr key={p.id} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50' : ''} opacity-60`}>
                    <td className="px-4 py-2.5 text-slate-500 line-through">{p.nombre || '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-500">
                        {ROLE_LABEL[p.rol] ?? p.rol}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button onClick={() => handleActivar(p.id)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                        Reactivar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Nota informativa */}
      <div className="card p-4 bg-blue-50 border border-blue-100">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 space-y-1">
            <p className="font-semibold">Gestión de credenciales</p>
            <p>Los nuevos usuarios reciben un correo de confirmación de Supabase Auth. El cambio de contraseña desde esta interfaz requiere la clave de servicio (service role key), que por seguridad no se expone en el cliente. Para resetear contraseñas, use el panel de Supabase o la función "Olvidé mi contraseña" en el login.</p>
            <p><strong>Roles:</strong> Administrador — acceso total. Coordinador — sin eliminación. Auxiliar — solo lectura y creación.</p>
          </div>
        </div>
      </div>

      {/* Modal crear/editar */}
      {modal && (
        <ProfileModal
          profile={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}

      {/* Confirmación desactivar */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">¿Desactivar usuario?</h3>
            <p className="text-sm text-slate-500 mb-5">El usuario perderá acceso al sistema pero sus registros se conservan. Puede reactivarlo en cualquier momento.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirm(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={() => handleDelete(confirm)} className="btn-primary bg-red-600 hover:bg-red-700 flex-1">Desactivar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
