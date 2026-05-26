import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import {
  Settings, Users, List, Paperclip, Mail,
  Plus, Pencil, Trash2, X, Save, ShieldCheck,
  User, Lock, AlertCircle, CheckCircle2,
  Search, RefreshCw, FileText, Send,
} from 'lucide-react'

// ── Shared constants ──────────────────────────────────────────
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
    <div className="px-3 py-2 bg-[#1a4fa0] border-l-4 border-white/40 rounded-r-md mb-4">
      <h3 className="text-sm font-semibold text-white tracking-wide">{children}</h3>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// TAB: USUARIOS
// ════════════════════════════════════════════════════════════════

function ProfileModal({ profile, onClose, onSaved }) {
  const isEdit = Boolean(profile?.id)
  const [form, setForm] = useState({
    nombre:   profile?.nombre ?? '',
    email:    profile?.email  ?? '',
    rol:      profile?.rol    ?? 'auxiliar',
    activo:   profile?.activo ?? true,
    password: '',
  })
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [resetting,  setResetting]  = useState(false)
  const [resetSent,  setResetSent]  = useState(false)

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleResetPassword() {
    setResetting(true)
    setError('')
    // redirectTo = base URL sin hash — main.jsx captura el token y redirige a #/reset-password
    const redirectTo = window.location.href.split('#')[0]
    const { error: err } = await supabase.auth.resetPasswordForEmail(
      profile.email,
      { redirectTo }
    )
    if (err) setError(err.message)
    else     setResetSent(true)
    setResetting(false)
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      if (isEdit) {
        const update = { nombre: form.nombre, rol: form.rol, activo: form.activo }
        const { error: err } = await supabase
          .from('user_profiles').update(update).eq('id', profile.id)
        if (err) throw err
        onSaved({ ...profile, ...update })
      } else {
        if (!form.email || !form.password) throw new Error('Email y contraseña son requeridos')
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: form.email, password: form.password,
        })
        if (signUpErr) throw signUpErr
        const uid = signUpData?.user?.id
        if (!uid) throw new Error('No se pudo obtener el ID del usuario')
        const { error: profErr } = await supabase.from('user_profiles').upsert({
          id: uid, nombre: form.nombre, rol: form.rol, activo: form.activo,
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
          {isEdit ? (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-medium text-slate-700 mb-2">Cambio de Contraseña</p>
              {resetSent ? (
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <p className="text-xs">Link de restablecimiento enviado a <strong>{profile.email}</strong></p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-500 mb-3">
                    Se enviará un enlace al correo del usuario para que establezca su nueva contraseña de forma segura.
                  </p>
                  <button type="button" onClick={handleResetPassword} disabled={resetting}
                    className="w-full py-2 rounded-lg text-xs font-semibold border-2 border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    {resetting
                      ? <><span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> Enviando...</>
                      : <><Send className="w-3 h-3" /> Enviar link de restablecimiento</>
                    }
                  </button>
                </>
              )}
            </div>
          ) : (
            <div>
              <label className="label">Contraseña *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input type="password" className="input pl-9"
                  placeholder="Mínimo 6 caracteres"
                  value={form.password} onChange={e => setF('password', e.target.value)} />
              </div>
            </div>
          )}
          <div>
            <label className="label">Rol *</label>
            <div className="flex gap-3 mt-1">
              {ROLES.map(r => (
                <button key={r} type="button" onClick={() => setF('rol', r)}
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
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
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

function UsuariosTab({ showToast }) {
  const [profiles, setProfiles] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null)
  const [confirm,  setConfirm]  = useState(null)

  useEffect(() => { loadProfiles() }, [])

  async function loadProfiles() {
    setLoading(true)
    const { data } = await supabase.from('user_profiles')
      .select('id, nombre, rol, activo, created_at').order('nombre')
    setProfiles(data ?? [])
    setLoading(false)
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('user_profiles').update({ activo: false }).eq('id', id)
    if (error) { showToast('Error al desactivar usuario'); return }
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, activo: false } : p))
    setConfirm(null)
    showToast('Usuario desactivado')
  }

  async function handleActivar(id) {
    const { error } = await supabase.from('user_profiles').update({ activo: true }).eq('id', id)
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

  const activos   = profiles.filter(p => p.activo !== false)
  const inactivos = profiles.filter(p => p.activo === false)

  return (
    <div className="space-y-6">
      {/* Header strip */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-teal-600" />
          <span className="font-semibold text-slate-700 text-sm">{activos.length} usuarios activos</span>
        </div>
        <button onClick={() => setModal('nuevo')} className="btn-primary text-xs gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Nuevo Usuario
        </button>
      </div>

      {/* Rol summary */}
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

      {/* Activos table */}
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
          <p className="p-8 text-center text-slate-400 text-sm">No hay usuarios activos</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1a4fa0] text-white">
                  <th className="text-left px-4 py-3 font-semibold text-xs">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs">ID / UUID</th>
                  <th className="text-center px-4 py-3 font-semibold text-xs">Rol</th>
                  <th className="text-center px-4 py-3 font-semibold text-xs">Acciones</th>
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
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors" title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setConfirm(p.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="Desactivar">
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

      {/* Inactivos */}
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

      {/* Info note */}
      <div className="card p-4 bg-blue-50 border border-blue-100">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 space-y-1">
            <p className="font-semibold">Gestión de credenciales</p>
            <p>Los nuevos usuarios reciben un correo de confirmación al registrarse. Para cambiar la contraseña de un usuario existente, abra su perfil con el botón editar y use el botón <strong>"Enviar link de restablecimiento"</strong> — el usuario recibirá un enlace seguro en su correo para establecer una nueva contraseña.</p>
            <p><strong>Roles:</strong> Administrador — acceso total · Coordinador — sin eliminación · Auxiliar — solo lectura y creación.</p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <ProfileModal
          profile={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}

      {/* Confirm deactivate */}
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

// ════════════════════════════════════════════════════════════════
// TAB: LISTAS DESPLEGABLES
// ════════════════════════════════════════════════════════════════

const ENCUESTA_TIPOS = [
  { v: 'general',              l: 'General (todos los formularios)' },
  { v: 'higiene_manos',        l: 'Higiene de Manos' },
  { v: 'aislamiento',          l: 'Aislamiento' },
  { v: 'luminometria',         l: 'Luminometría' },
  { v: 'ronda_cirugia',        l: 'Ronda de Cirugía' },
  { v: 'acceso_venoso',        l: 'Acceso Venoso Periférico' },
  { v: 'cateter_vesical',      l: 'Catéter Vesical' },
  { v: 'prevencion_neumonia',  l: 'Prevención NAV' },
]

function ListaModal({ item, onClose, onSaved }) {
  const isEdit = Boolean(item?.id)
  const [form, setForm] = useState({
    categoria:    item?.categoria    ?? '',
    valor:        item?.valor        ?? '',
    orden:        item?.orden        ?? 0,
    activo:       item?.activo       ?? true,
    encuesta_tipo: item?.encuesta_tipo ?? 'general',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSave() {
    if (!form.categoria.trim() || !form.valor.trim()) {
      setError('Categoría y valor son requeridos')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        categoria:     form.categoria.trim(),
        valor:         form.valor.trim(),
        orden:         Number(form.orden) || 0,
        activo:        form.activo,
        encuesta_tipo: form.encuesta_tipo || 'general',
      }
      if (isEdit) {
        const { error: err } = await supabase.from('listas_desplegables').update(payload).eq('id', item.id)
        if (err) throw err
        onSaved({ ...item, ...payload })
      } else {
        const { data, error: err } = await supabase.from('listas_desplegables').insert(payload).select().single()
        if (err) throw err
        onSaved(data)
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
              <List className="w-4 h-4 text-violet-600" />
            </div>
            <h2 className="font-semibold text-slate-800">{isEdit ? 'Editar Ítem' : 'Nuevo Ítem'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Categoría *</label>
            <input className="input" placeholder="ej. servicios, tipos_aislamiento"
              value={form.categoria} onChange={e => setF('categoria', e.target.value)} />
            <p className="text-xs text-slate-400 mt-1">Identificador interno sin espacios (snake_case)</p>
          </div>
          <div>
            <label className="label">Valor *</label>
            <input className="input" placeholder="Texto que verá el usuario"
              value={form.valor} onChange={e => setF('valor', e.target.value)} />
          </div>
          <div>
            <label className="label">Formulario / Encuesta</label>
            <select className="input" value={form.encuesta_tipo} onChange={e => setF('encuesta_tipo', e.target.value)}>
              {ENCUESTA_TIPOS.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
            <p className="text-xs text-slate-400 mt-1">Indica en qué formulario aparecerá este ítem</p>
          </div>
          <div>
            <label className="label">Orden</label>
            <input type="number" className="input" placeholder="0"
              value={form.orden} onChange={e => setF('orden', e.target.value)} />
            <p className="text-xs text-slate-400 mt-1">Número para ordenar en la lista (0 = primero)</p>
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600"
              checked={form.activo} onChange={e => setF('activo', e.target.checked)} />
            <span className="text-sm text-slate-700">Ítem activo</span>
          </label>
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-slate-100">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando...</>
              : <><Save className="w-4 h-4" /> {isEdit ? 'Actualizar' : 'Crear'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function ListasTab({ showToast }) {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)   // null | 'nuevo' | item-object
  const [search,  setSearch]  = useState('')
  const [catFilter, setCatFilter] = useState('')

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    setLoading(true)
    const { data } = await supabase.from('listas_desplegables')
      .select('*').order('categoria').order('orden').order('valor')
    setItems(data ?? [])
    setLoading(false)
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('listas_desplegables').delete().eq('id', id)
    if (error) { showToast('Error al eliminar ítem'); return }
    setItems(prev => prev.filter(i => i.id !== id))
    showToast('Ítem eliminado')
  }

  function onSaved(updated) {
    setItems(prev => {
      const exists = prev.find(i => i.id === updated.id)
      if (exists) return prev.map(i => i.id === updated.id ? updated : i)
      return [...prev, updated].sort((a, b) =>
        a.categoria.localeCompare(b.categoria) || (a.orden - b.orden) || a.valor.localeCompare(b.valor)
      )
    })
    showToast('Ítem guardado')
  }

  const categorias = useMemo(() => [...new Set(items.map(i => i.categoria))].sort(), [items])

  const filtered = useMemo(() => items.filter(i => {
    if (catFilter && i.categoria !== catFilter) return false
    if (search && !i.valor.toLowerCase().includes(search.toLowerCase()) &&
        !i.categoria.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [items, catFilter, search])

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input className="input pl-9 text-sm" placeholder="Buscar..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input text-sm w-44" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={loadItems} className="btn-secondary text-xs gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Recargar
          </button>
          <button onClick={() => setModal('nuevo')} className="btn-primary text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Nuevo Ítem
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <List className="w-4 h-4 text-violet-500" />
          <span className="font-semibold text-slate-700 text-sm">
            {filtered.length} {filtered.length === 1 ? 'ítem' : 'ítems'}
            {catFilter && ` · ${catFilter}`}
          </span>
        </div>
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-slate-400 text-sm">Sin resultados</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#1a4fa0] text-white">
                  <th className="text-left px-4 py-3 font-semibold">Categoría</th>
                  <th className="text-left px-4 py-3 font-semibold">Valor</th>
                  <th className="text-center px-3 py-3 font-semibold">Orden</th>
                  <th className="text-center px-3 py-3 font-semibold">Estado</th>
                  <th className="text-center px-3 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, i) => (
                  <tr key={item.id} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50' : ''} hover:bg-violet-50 transition-colors`}>
                    <td className="px-4 py-2.5 font-mono text-slate-500">{item.categoria}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-700">{item.valor}</td>
                    <td className="px-3 py-2.5 text-center text-slate-400">{item.orden ?? 0}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold
                        ${item.activo !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {item.activo !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setModal(item)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors" title="Editar">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="Eliminar">
                          <Trash2 className="w-3 h-3" />
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

      {/* Modal */}
      {modal && (
        <ListaModal
          item={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// TAB: ARCHIVOS ADJUNTOS
// ════════════════════════════════════════════════════════════════

function ArchivosTab() {
  const [archivos, setArchivos] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')

  useEffect(() => {
    supabase.from('archivos_adjuntos').select('*').order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => { setArchivos(data ?? []); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    if (!search) return archivos
    const q = search.toLowerCase()
    return archivos.filter(a =>
      (a.nombre_archivo ?? '').toLowerCase().includes(q) ||
      (a.tipo_encuesta  ?? '').toLowerCase().includes(q) ||
      (a.subido_por     ?? '').toLowerCase().includes(q)
    )
  }, [archivos, search])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input className="input pl-9 text-sm" placeholder="Buscar archivos..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="text-xs text-slate-400 shrink-0">{filtered.length} archivos</span>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-700 text-sm">Archivos Adjuntos — vista de solo lectura</span>
        </div>
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-slate-400 text-sm">No hay archivos registrados</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#1a4fa0] text-white">
                  <th className="text-left px-4 py-3 font-semibold">Nombre</th>
                  <th className="text-left px-3 py-3 font-semibold">Tipo Encuesta</th>
                  <th className="text-left px-3 py-3 font-semibold">Subido por</th>
                  <th className="text-center px-3 py-3 font-semibold">Fecha</th>
                  <th className="text-center px-3 py-3 font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <tr key={a.id} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50' : ''} hover:bg-blue-50 transition-colors`}>
                    <td className="px-4 py-2.5 font-medium text-slate-700 max-w-[200px] truncate">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {a.nombre_archivo || '—'}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-500">{a.tipo_encuesta || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-500 truncate max-w-[140px]">{a.subido_por || '—'}</td>
                    <td className="px-3 py-2.5 text-center font-mono text-slate-400">
                      {a.created_at ? a.created_at.slice(0, 10) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {a.url ? (
                        <a href={a.url} target="_blank" rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                          Ver
                        </a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// TAB: EMAIL LOGS
// ════════════════════════════════════════════════════════════════

const ESTADO_EMAIL_BADGE = {
  enviado:  'bg-emerald-100 text-emerald-700',
  error:    'bg-red-100 text-red-700',
  pendiente:'bg-yellow-100 text-yellow-700',
}

function EmailLogsTab() {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')

  useEffect(() => {
    supabase.from('email_logs').select('*').order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => { setLogs(data ?? []); setLoading(false) })
  }, [])

  const filtered = useMemo(() => {
    if (!search) return logs
    const q = search.toLowerCase()
    return logs.filter(l =>
      (l.destinatario ?? '').toLowerCase().includes(q) ||
      (l.asunto       ?? '').toLowerCase().includes(q) ||
      (l.estado       ?? '').toLowerCase().includes(q)
    )
  }, [logs, search])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input className="input pl-9 text-sm" placeholder="Buscar en logs..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="text-xs text-slate-400 shrink-0">{filtered.length} registros</span>
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <Send className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-slate-700 text-sm">Logs de Email — vista de solo lectura</span>
        </div>
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-slate-400 text-sm">
            {search ? 'Sin resultados para la búsqueda' : 'No hay registros de email'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#1a4fa0] text-white">
                  <th className="text-left px-4 py-3 font-semibold">Destinatario</th>
                  <th className="text-left px-3 py-3 font-semibold">Asunto</th>
                  <th className="text-center px-3 py-3 font-semibold">Estado</th>
                  <th className="text-center px-3 py-3 font-semibold">Fecha</th>
                  <th className="text-left px-3 py-3 font-semibold">Error</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l, i) => (
                  <tr key={l.id} className={`border-b border-slate-50 ${i % 2 === 1 ? 'bg-slate-50' : ''} hover:bg-orange-50 transition-colors`}>
                    <td className="px-4 py-2.5 font-medium text-slate-700 truncate max-w-[160px]">{l.destinatario || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600 truncate max-w-[220px]">{l.asunto || '—'}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-semibold
                        ${ESTADO_EMAIL_BADGE[l.estado] ?? 'bg-slate-100 text-slate-500'}`}>
                        {l.estado || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono text-slate-400">
                      {l.created_at ? l.created_at.slice(0, 10) : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-red-500 truncate max-w-[180px]">{l.error || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════

const TABS = [
  { key: 'usuarios',  label: 'Usuarios',            icon: Users,     adminOnly: true  },
  { key: 'listas',    label: 'Listas Desplegables',  icon: List,      adminOnly: true  },
  { key: 'archivos',  label: 'Archivos Adjuntos',    icon: Paperclip, adminOnly: false },
  { key: 'email',     label: 'Email Logs',           icon: Mail,      adminOnly: true  },
]

export default function Configuracion() {
  const { rol } = useAuth()
  const [activeTab, setActiveTab] = useState('usuarios')
  const [toast,     setToast]     = useState('')

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const visibleTabs = rol === 'administrador'
    ? TABS
    : TABS.filter(t => !t.adminOnly)

  // If current tab is not accessible, switch to first visible
  const effectiveTab = visibleTabs.find(t => t.key === activeTab)
    ? activeTab
    : (visibleTabs[0]?.key ?? 'archivos')

  if (rol !== 'administrador' && rol !== 'coordinador') {
    return (
      <div className="p-6 lg:p-8 animate-fade-in">
        <div className="card p-8 text-center text-slate-400">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Acceso restringido</p>
          <p className="text-xs mt-1">Solo administradores y coordinadores pueden acceder a la configuración</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#1a4fa0] text-white px-4 py-2.5 rounded-xl shadow-lg text-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
          <Settings className="w-5 h-5 text-slate-600" />
        </div>
        <div>
          <h1 className="page-title">Configuración</h1>
          <p className="page-subtitle">Gestión de usuarios, listas y registros del sistema</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {visibleTabs.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                effectiveTab === tab.key
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}>
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {effectiveTab === 'usuarios'  && <UsuariosTab  showToast={showToast} />}
      {effectiveTab === 'listas'    && <ListasTab    showToast={showToast} />}
      {effectiveTab === 'archivos'  && <ArchivosTab />}
      {effectiveTab === 'email'     && <EmailLogsTab />}
    </div>
  )
}
