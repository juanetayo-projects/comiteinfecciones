import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import {
  Plus, Pencil, Trash2, X, Save, AlertCircle, Search, RefreshCw, Stethoscope,
} from 'lucide-react'

// Gestión del catálogo `medicos` (alimenta el campo Médico de Adherencia a
// Fichas). Se usa en Configuración → Médicos y en el propio módulo de
// Adherencia a Fichas. Crear/editar: cualquier usuario; eliminar: sólo admin.

function MedicoModal({ medico, onClose, onSaved }) {
  const isEdit = Boolean(medico?.id)
  const [form, setForm] = useState({
    nombre: medico?.nombre ?? '',
    activo: medico?.activo ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSave() {
    if (!form.nombre.trim()) {
      setError('El nombre es requerido')
      return
    }
    setSaving(true)
    setError('')
    try {
      // Mismo criterio que los demás catálogos: siempre en mayúsculas para
      // que un mismo médico no quede partido en dos por capitalización.
      const payload = { nombre: form.nombre.trim().toUpperCase(), activo: form.activo }
      if (isEdit) {
        const { error: err } = await supabase.from('medicos').update(payload).eq('id', medico.id)
        if (err) throw err
        onSaved({ ...medico, ...payload })
      } else {
        const { data, error: err } = await supabase.from('medicos').insert(payload).select().single()
        if (err) throw err
        onSaved(data)
      }
      onClose()
    } catch (e) {
      setError(e.code === '23505' ? 'Ya existe un médico con ese nombre' : e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-neu-surface rounded-3xl shadow-neu-lg border border-white/70 w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-teal-600" />
            </div>
            <h2 className="font-semibold text-slate-800">{isEdit ? 'Editar Médico' : 'Nuevo Médico'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="label">Nombre completo *</label>
            <input className="input" placeholder="ej. JUAN CAMILO VALENCIA"
              value={form.nombre} onChange={e => setF('nombre', e.target.value)} />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded accent-brand-600"
              checked={form.activo} onChange={e => setF('activo', e.target.checked)} />
            <span className="text-sm text-slate-700">Médico activo</span>
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

export default function MedicosManager({ showToast }) {
  const { rol } = useAuth()
  const puedeEliminar = rol === 'administrador'
  const [medicos, setMedicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)   // null | 'nuevo' | medico-object
  const [confirm, setConfirm] = useState(null)
  const [search,  setSearch]  = useState('')

  useEffect(() => { loadMedicos() }, [])

  async function loadMedicos() {
    setLoading(true)
    const { data } = await supabase.from('medicos').select('*').order('nombre')
    setMedicos(data ?? [])
    setLoading(false)
  }

  async function handleDelete(id) {
    const { error } = await supabase.from('medicos').delete().eq('id', id)
    if (error) { showToast('Error al eliminar médico'); return }
    setMedicos(prev => prev.filter(m => m.id !== id))
    setConfirm(null)
    showToast('Médico eliminado')
  }

  function onSaved(updated) {
    setMedicos(prev => {
      const exists = prev.find(m => m.id === updated.id)
      const next = exists ? prev.map(m => m.id === updated.id ? updated : m) : [...prev, updated]
      return next.sort((a, b) => a.nombre.localeCompare(b.nombre))
    })
    showToast('Médico guardado')
  }

  const filtered = useMemo(() => {
    if (!search) return medicos
    const q = search.toLowerCase()
    return medicos.filter(m => m.nombre.toLowerCase().includes(q))
  }, [medicos, search])

  const activos = medicos.filter(m => m.activo !== false).length

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-teal-600" />
          <span className="font-semibold text-slate-700 text-sm">{activos} médicos activos</span>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input className="input pl-9 text-sm" placeholder="Buscar médico..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={loadMedicos} className="btn-secondary text-xs gap-1.5 shrink-0">
            <RefreshCw className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Recargar</span>
          </button>
          <button onClick={() => setModal('nuevo')} className="btn-primary text-xs gap-1.5 shrink-0">
            <Plus className="w-3.5 h-3.5" /> Nuevo Médico
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-teal-600" />
          <span className="font-semibold text-slate-700 text-sm">
            {filtered.length} {filtered.length === 1 ? 'médico' : 'médicos'}
          </span>
        </div>
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="w-6 h-6 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-slate-400 text-sm">Sin resultados</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-head-brand">
                  <th className="text-left px-4 py-3 font-semibold text-xs">Nombre</th>
                  <th className="text-center px-3 py-3 font-semibold text-xs">Estado</th>
                  <th className="text-center px-3 py-3 font-semibold text-xs">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <tr key={m.id} className={`border-b border-white/70 ${i % 2 === 1 ? 'bg-white/55' : ''} hover:bg-teal-50 transition-colors`}>
                    <td className="px-4 py-2.5 font-medium text-slate-700">{m.nombre}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold
                        ${m.activo !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {m.activo !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setModal(m)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-brand-600 transition-colors" title="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {puedeEliminar && (
                          <button onClick={() => setConfirm(m.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors" title="Eliminar">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info note */}
      <div className="card p-4 bg-blue-50 border border-blue-100">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Este listado alimenta directamente el campo <strong>Médico</strong> del formulario de
            Adherencia a Fichas Epidemiológicas. Desactiva un médico para que deje de aparecer en el
            desplegable sin perder el historial de revisiones ya registradas a su nombre.
          </p>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <MedicoModal
          medico={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={onSaved}
        />
      )}

      {/* Confirm delete */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-neu-surface rounded-3xl shadow-neu-lg border border-white/70 p-6 w-full max-w-sm text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">¿Eliminar médico?</h3>
            <p className="text-sm text-slate-500 mb-5">Esta acción no se puede deshacer. Las revisiones ya guardadas conservarán el nombre tal como quedó registrado.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setConfirm(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={() => handleDelete(confirm)} className="btn-primary bg-red-600 hover:bg-red-700 flex-1">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
