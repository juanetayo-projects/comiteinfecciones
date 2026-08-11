import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { guardarEncuesta, esEditable } from '../../lib/guardarEncuesta'
import { useAuth } from '../../contexts/AuthContext'
import BannerSoloLectura from '../../components/common/BannerSoloLectura'
import SinPermisoCaptura from '../../components/common/SinPermisoCaptura'
import SearchableSelect from '../../components/common/SearchableSelect'
import { ArrowLeft, Save, BarChart3 } from 'lucide-react'
import { useLista } from '../../hooks/useLista'

const SEDES_FALLBACK = ['TORRE CACSB', 'URGENCIAS CACSB']

const SERVICIOS_FALLBACK = [
  'CIRUGÍA', 'HOSPITALIZACIÓN', 'HOSPITALIZACIÓN 2', 'HOSPITALIZACIÓN 7', 'HOSPITALIZACIÓN 8',
  'HOSPITALIZACIÓN PARCIAL', 'UCI/UCIN', 'URGENCIAS', 'URGENCIAS HD', 'URGENCIAS PEDIÁTRICA',
]

const TIPOS_ERROR_FALLBACK = [
  'ERROR EN CLASIFICACIÓN DEL EVENTO', 'FICHA DESACTUALIZADA', 'FICHA INCORRECTA',
  'NO REALIZA CARA A - OMITE TIPO DE ALIMENTO INGERIDO', 'NO REALIZAN FICHA EPIDEMIOLÓGICA',
  'OMITE INFORMACIÓN',
]

const CODIGOS_FALLBACK = [
  'COG. 210', 'COG. 220', 'COG. 300', 'COG. 301', 'COG. 330', 'COG. 345', 'COG. 346',
  'COG. 348', 'COG. 355', 'COG. 356', 'COG. 365', 'COG. 455', 'COG. 620', 'COG. 670',
  'COG. 755', 'COG. 813', 'COG. 831', 'COG. 850', 'COG. 875',
]

const schema = z.object({
  fecha_revision:    z.string().min(1, 'Requerido'),
  sede:              z.string().min(1, 'Requerido'),
  servicio:          z.string().min(1, 'Requerido'),
  medico:            z.string().min(1, 'Requerido'),
  codigo_evento:     z.string().min(1, 'Requerido'),
  resultado:         z.enum(['ADECUADO', 'CON ERROR'], { errorMap: () => ({ message: 'Requerido' }) }),
  tipo_error:        z.string().optional(),
  observacion:       z.string().optional(),
  accion_correctiva: z.string().optional(),
  estado:            z.string().default('pendiente'),
}).refine(v => v.resultado !== 'CON ERROR' || !!v.tipo_error, {
  message: 'Selecciona el tipo de error', path: ['tipo_error'],
})

function SH({ children }) {
  return (
    <div className="px-3.5 py-2.5 bg-brand-gradient border-l-4 border-accent-400 rounded-r-xl shadow-neu-sm mb-4">
      <h3 className="text-sm font-semibold text-white tracking-wide">{children}</h3>
    </div>
  )
}

export default function AdherenciaFichasForm() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { user, rol, puedeCapturar: puedeCapturarModulo } = useAuth()
  const puedeCapturar = puedeCapturarModulo('adherencia_fichas')
  const isEdit    = Boolean(id)
  const [saving,    setSaving]    = useState(false)
  const [saveError, setSaveError] = useState('')
  const [soloLectura, setSoloLectura] = useState(false)
  const [estadoReg,   setEstadoReg]   = useState(null)
  const [loaded,      setLoaded]      = useState(!isEdit)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fecha_revision: new Date().toISOString().slice(0, 10),
      resultado: 'ADECUADO',
      estado: 'pendiente',
    },
  })

  const sedes      = useLista('adherencia_sede', SEDES_FALLBACK)
  const servicios  = useLista('adherencia_servicio', SERVICIOS_FALLBACK)
  const medicos    = useLista('adherencia_medico', [])
  const codigos    = useLista('adherencia_codigo_evento', CODIGOS_FALLBACK)
  const tiposError = useLista('adherencia_tipo_error', TIPOS_ERROR_FALLBACK)

  const resultado = watch('resultado')

  useEffect(() => {
    if (isEdit) {
      supabase.from('encuesta_adherencia_fichas').select('*').eq('id', id).single()
        .then(({ data }) => {
          if (data) {
            reset(data)
            setEstadoReg(data.estado)
            setSoloLectura(!esEditable(data.estado, rol) || !puedeCapturar)
          }
          setLoaded(true)
        })
    }
  }, [id])

  async function onSubmit(vals) {
    setSaving(true)
    setSaveError('')
    const payload = {
      ...vals,
      tipo_error: vals.resultado === 'CON ERROR' ? vals.tipo_error : null,
      registrado_por: isEdit ? undefined : user?.id,
    }
    const { error } = await guardarEncuesta('encuesta_adherencia_fichas', payload, isEdit ? id : undefined)
    if (error) {
      setSaveError(error)
      setSaving(false)
      return
    }
    navigate('/encuestas/adherencia-fichas')
  }

  if (!loaded) return (
    <div className="p-8 flex justify-center">
      <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // El rol no tiene habilitada la captura en este módulo (Configuración → Permisos)
  if (!isEdit && !puedeCapturar) {
    return <SinPermisoCaptura volverTo="/encuestas/adherencia-fichas" />
  }

  return (
    <div className="p-6 lg:p-8 animate-fade-in max-w-3xl">
      <div className="flex items-start gap-3 mb-6">
        <Link to="/encuestas/adherencia-fichas"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors mt-1">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">{isEdit ? 'Editar' : 'Nueva'} Revisión — Ficha Epidemiológica</h1>
          <p className="page-subtitle">Adherencia al correcto diligenciamiento de fichas SIVIGILA</p>
        </div>
        <Link to="/encuestas/adherencia-fichas/dashboard"
          className="inline-flex items-center gap-1.5 btn-secondary text-xs mt-1">
          <BarChart3 className="w-3.5 h-3.5" /> Dashboard
        </Link>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {soloLectura && <BannerSoloLectura estado={estadoReg} />}

        <fieldset disabled={soloLectura} className="space-y-5 min-w-0">

        <div className="card p-5">
          <SH>Datos de la Revisión</SH>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha de Revisión *</label>
              <input type="date" className="input" {...register('fecha_revision')} />
              {errors.fecha_revision && <p className="text-xs text-red-600 mt-1">{errors.fecha_revision.message}</p>}
            </div>
            <div>
              <label className="label">Sede *</label>
              <select className="input" {...register('sede')}>
                <option value="">Seleccionar...</option>
                {sedes.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.sede && <p className="text-xs text-red-600 mt-1">{errors.sede.message}</p>}
            </div>
            <div>
              <label className="label">Servicio *</label>
              <select className="input" {...register('servicio')}>
                <option value="">Seleccionar...</option>
                {servicios.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.servicio && <p className="text-xs text-red-600 mt-1">{errors.servicio.message}</p>}
            </div>
            <div>
              <label className="label">Médico *</label>
              <SearchableSelect
                options={medicos}
                value={watch('medico') ?? ''}
                onChange={v => setValue('medico', v, { shouldDirty: true, shouldValidate: true })}
                placeholder="Buscar médico..."
                disabled={soloLectura}
              />
              {errors.medico && <p className="text-xs text-red-600 mt-1">{errors.medico.message}</p>}
            </div>
            <div>
              <label className="label">Código del Evento (SIVIGILA) *</label>
              <select className="input" {...register('codigo_evento')}>
                <option value="">Seleccionar...</option>
                {codigos.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.codigo_evento && <p className="text-xs text-red-600 mt-1">{errors.codigo_evento.message}</p>}
            </div>
          </div>
        </div>

        <div className="card p-5">
          <SH>Resultado del Diligenciamiento</SH>
          <div className="flex gap-3 mb-4">
            <label className={`flex-1 cursor-pointer rounded-xl border px-4 py-3 text-center text-sm font-semibold transition-colors
              ${resultado === 'ADECUADO' ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'border-slate-200 text-slate-500'}`}>
              <input type="radio" value="ADECUADO" className="sr-only" {...register('resultado')} />
              ADECUADO
            </label>
            <label className={`flex-1 cursor-pointer rounded-xl border px-4 py-3 text-center text-sm font-semibold transition-colors
              ${resultado === 'CON ERROR' ? 'bg-red-100 border-red-300 text-red-800' : 'border-slate-200 text-slate-500'}`}>
              <input type="radio" value="CON ERROR" className="sr-only" {...register('resultado')} />
              CON ERROR
            </label>
          </div>

          {resultado === 'CON ERROR' && (
            <div>
              <label className="label">Tipo de Error *</label>
              <select className="input" {...register('tipo_error')}>
                <option value="">Seleccionar...</option>
                {tiposError.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.tipo_error && <p className="text-xs text-red-600 mt-1">{errors.tipo_error.message}</p>}
            </div>
          )}
        </div>

        <div className="card p-5">
          <SH>Observaciones y Seguimiento</SH>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="label">Observación</label>
              <textarea rows={3} className="input resize-none"
                placeholder="Descripción del hallazgo..." {...register('observacion')} />
            </div>
            <div>
              <label className="label">Acción Correctiva</label>
              <textarea rows={2} className="input resize-none"
                placeholder="Retroalimentación o corrección aplicada..." {...register('accion_correctiva')} />
            </div>
            <div className="sm:max-w-xs">
              <label className="label">Estado</label>
              <select className="input" {...register('estado')}>
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En Proceso</option>
                <option value="validado">Validado</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
          </div>
        </div>

        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            ⚠️ Error al guardar: {saveError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link to="/encuestas/adherencia-fichas" className="btn-secondary">Cancelar</Link>
          <button type="submit" disabled={saving || soloLectura} hidden={soloLectura} className="btn-primary">
            {saving
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando...</>
              : <><Save className="w-4 h-4" /> {isEdit ? 'Actualizar' : 'Guardar'}</>}
          </button>
        </div>
        </fieldset>
      </form>
    </div>
  )
}
