import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { guardarEncuesta, esEditable } from '../../lib/guardarEncuesta'
import { useAuth } from '../../contexts/AuthContext'
import FileUpload from '../../components/common/FileUpload'
import BannerSoloLectura from '../../components/common/BannerSoloLectura'
import SinPermisoCaptura from '../../components/common/SinPermisoCaptura'
import { ArrowLeft, Save, AlertTriangle } from 'lucide-react'
import { useLista } from '../../hooks/useLista'

// Servicios y objetos dependientes (claves = nombres exactos del listado institucional).
// TODO EN MAYÚSCULAS: los catálogos de la app están normalizados a mayúsculas para
// que las gráficas no partan una misma categoría en dos (ver docs/BRANDING_Y_CORREOS.md).
const SERVICIOS_OBJETOS = {
  'CIRUGÍA': [
    'ARCO EN C',
    'BOMBA DE INFUSIÓN',
    'CAMILLA',
    'MÁQUINA DE ANESTESIA (PERILLA)',
    'MESA DE MAYO',
    'VENTILADOR (PERILLA)',
  ],
  'HOSPITALIZACIÓN 2': [
    'BOMBA DE INFUSIÓN',
    'CAMA (PANEL DE CONTROL)',
    'COLCHÓN',
  ],
  'HOSPITALIZACIÓN 7': [
    'BOMBA DE INFUSIÓN',
    'CAMA (PANEL DE CONTROL)',
    'COLCHÓN',
  ],
  'HOSPITALIZACIÓN 8': [
    'BOMBA DE INFUSIÓN',
    'CAMA (PANEL DE CONTROL)',
    'COLCHÓN',
  ],
  'HOSPITALIZACIÓN PARCIAL': [
    'BOMBA DE INFUSIÓN',
    'CAMA (PANEL DE CONTROL)',
    'COLCHÓN',
  ],
  'UCI': [
    'BOMBA DE INFUSIÓN',
    'CAMA (PANEL DE CONTROL)',
    'COLCHÓN',
    'MINDRAY SIGNOS VITALES',
    'VENTILADOR',
  ],
  'UCIN': [
    'BOMBA DE INFUSIÓN',
    'CAMA (PANEL DE CONTROL)',
    'COLCHÓN',
    'MINDRAY SIGNOS VITALES',
    'VENTILADOR',
  ],
  'URGENCIAS ADULTO': [
    'BOMBA DE INFUSIÓN',
    'COLCHONETA',
    'VENTILADOR',
  ],
  'URGENCIAS PEDIATRICAS': [
    'BOMBA DE INFUSIÓN',
    'COLCHONETA',
    'VENTILADOR',
  ],
}

const SERVICIOS_LUM = Object.keys(SERVICIOS_OBJETOS)

function calcRango(rlu) {
  const n = Number(rlu)
  if (isNaN(n) || rlu === '' || rlu === undefined || rlu === null) return null
  return n < 100 ? 'CUMPLE' : 'NO CUMPLE'
}

const RANGO_STYLE = {
  'CUMPLE':    'bg-emerald-50 text-emerald-800 border-emerald-200',
  'NO CUMPLE': 'bg-red-50 text-red-800 border-red-200',
}
const RANGO_DESC = {
  'CUMPLE':    '< 100 RLU — Superficie limpia',
  'NO CUMPLE': '≥ 100 RLU — Requiere acción de limpieza',
}

/**
 * Servicio reservado para dejar constancia de que la medición NO pudo hacerse
 * (p. ej. no había insumos físicos para ejecutar la actividad). Al elegirlo sólo
 * se pide la observación y el registro queda marcado como NO APLICA, de modo que
 * no entra en el cálculo de adherencia de los tableros.
 */
export const SERVICIO_SIN_MEDICION = 'COMITÉ DE INFECCIONES'

const schema = z.object({
  fecha_registro:    z.string().min(1, 'Requerido'),
  servicio_evaluado: z.string().min(1, 'Requerido'),
  objeto:            z.string().optional(),
  resultado:         z.union([z.coerce.number().min(0, 'Debe ser ≥ 0'), z.literal('' ), z.undefined()]).optional(),
  observaciones:     z.string().optional(),
  estado:            z.string().default('pendiente'),
}).superRefine((d, ctx) => {
  if (d.servicio_evaluado === SERVICIO_SIN_MEDICION) {
    // Sin medición: lo único obligatorio es explicar por qué
    if (!d.observaciones || d.observaciones.trim().length < 5) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['observaciones'],
        message: 'Explica por qué no se pudo realizar la medición' })
    }
    return
  }
  // Medición normal: objeto y RLU son obligatorios
  if (!d.objeto) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['objeto'], message: 'Requerido' })
  }
  if (d.resultado === '' || d.resultado === undefined || d.resultado === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['resultado'], message: 'Requerido' })
  }
})

function SH({ children }) {
  return (
    <div className="px-3.5 py-2.5 bg-brand-gradient border-l-4 border-accent-400 rounded-r-xl shadow-neu-sm mb-4">
      <h3 className="text-sm font-semibold text-white tracking-wide">{children}</h3>
    </div>
  )
}

export default function LuminometriaForm() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user, rol, puedeCapturar: puedeCapturarModulo } = useAuth()
  const puedeCapturar = puedeCapturarModulo('luminometria')
  const isEdit   = Boolean(id)
  const [saving,    setSaving]    = useState(false)
  const [adjuntos,  setAdjuntos]  = useState([])
  const [saveError, setSaveError] = useState('')
  // Un registro validado/cerrado se abre en modo consulta (ver RLS: puede_editar_encuesta)
  const [soloLectura, setSoloLectura] = useState(false)
  const [estadoReg,   setEstadoReg]   = useState(null)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fecha_registro: new Date().toISOString().slice(0, 10), estado: 'pendiente' },
  })

  const listaServicios = useLista('servicio', SERVICIOS_LUM)
  const objetosDB      = useLista('objeto',   [])
  const servicio       = watch('servicio_evaluado')
  const rlu            = watch('resultado')

  // "Sin medición": sólo aplica a luminometría, por eso se añade aquí y no al
  // catálogo compartido 'servicio' (que alimenta también a las demás encuestas).
  const sinMedicion = servicio === SERVICIO_SIN_MEDICION
  const serviciosDB = [...new Set([...listaServicios, SERVICIO_SIN_MEDICION])]

  const rango   = sinMedicion ? 'NO APLICA' : calcRango(rlu)
  // Use hardcoded service→object map if available; fall back to all DB objects
  const hardObj = SERVICIOS_OBJETOS[servicio] ?? []
  const objetos = servicio ? (hardObj.length > 0 ? hardObj : objetosDB) : []

  // Reset objeto when servicio changes
  useEffect(() => {
    if (!isEdit) setValue('objeto', '')
  }, [servicio])

  // Al pasar a "sin medición" se limpian los campos de medida
  useEffect(() => {
    if (sinMedicion) { setValue('objeto', ''); setValue('resultado', '') }
  }, [sinMedicion])

  useEffect(() => {
    if (isEdit) {
      supabase.from('encuesta_luminometria').select('*').eq('id', id).single()
        .then(({ data }) => {
          if (data) {
            reset(data)
            setAdjuntos(data.adjuntos ?? [])
            setEstadoReg(data.estado)
            setSoloLectura(!esEditable(data.estado, rol))
          }
        })
    }
  }, [id])

  async function onSubmit(values) {
    setSaving(true)
    setSaveError('')
    const payload = {
      ...values,
      // `resultado` es numeric en la BD: la cadena vacía la rechazaría
      resultado: sinMedicion || values.resultado === '' ? null : values.resultado,
      objeto:    sinMedicion ? null : (values.objeto || null),
      rango:     rango ?? '',
      adjuntos,
      registrado_por: isEdit ? undefined : user?.id,
    }
    const { error } = await guardarEncuesta('encuesta_luminometria', payload, isEdit ? id : undefined)
    if (error) {
      setSaveError(error)
      setSaving(false)
      return
    }
    navigate('/encuestas/luminometria')
  }

  // El rol no tiene habilitada la captura en este módulo (Configuración → Permisos)
  if (!isEdit && !puedeCapturar) {
    return <SinPermisoCaptura volverTo="/encuestas/luminometria" />
  }

  return (
    <div className="p-6 lg:p-8 animate-fade-in max-w-2xl">
      <div className="mb-6">
        <Link to="/encuestas/luminometria"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a registros
        </Link>
        <h1 className="page-title">{isEdit ? 'Editar' : 'Nueva'} Medición — Luminometría</h1>
        <p className="page-subtitle">Control de limpieza ambiental por ATP bioluminiscencia</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {soloLectura && <BannerSoloLectura estado={estadoReg} />}

        <fieldset disabled={soloLectura} className="space-y-5 min-w-0">

        {/* Datos generales */}
        <div className="card p-5">
          <SH>Datos de la Medición</SH>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha de Registro *</label>
              <input type="date" className="input" {...register('fecha_registro')} />
              {errors.fecha_registro && <p className="text-xs text-red-600 mt-1">{errors.fecha_registro.message}</p>}
            </div>

            <div>
              <label className="label">Servicio *</label>
              <select className="input" {...register('servicio_evaluado')}>
                <option value="">Seleccionar...</option>
                {serviciosDB.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.servicio_evaluado && <p className="text-xs text-red-600 mt-1">{errors.servicio_evaluado.message}</p>}
            </div>

            {/* En "sin medición" no se evalúa ninguna superficie */}
            {!sinMedicion && (
              <div className="sm:col-span-2">
                <label className="label">Objeto / Superficie evaluada *</label>
                {servicio ? (
                  <select className="input" {...register('objeto')}>
                    <option value="">Seleccionar objeto...</option>
                    {objetos.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <div className="input bg-slate-50 text-slate-400 cursor-not-allowed">
                    Selecciona primero un servicio
                  </div>
                )}
                {errors.objeto && <p className="text-xs text-red-600 mt-1">{errors.objeto.message}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Medición no realizada — sólo se documenta el motivo */}
        {sinMedicion && (
          <div className="card p-5">
            <SH>Medición No Realizada</SH>
            <div className="rounded-2xl bg-amber-50 shadow-neu-in-xs border border-amber-200/70 px-4 py-3 mb-4 flex items-start gap-3">
              <div className="w-9 h-9 shrink-0 rounded-xl bg-amber-100 shadow-neu-xs flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
              </div>
              <p className="text-xs text-amber-800">
                Con el servicio <strong>{SERVICIO_SIN_MEDICION}</strong> se deja constancia de que
                la luminometría no pudo realizarse (por ejemplo, por falta de insumos). No se
                diligencian superficie ni RLU, y el registro se clasifica como{' '}
                <strong>NO APLICA</strong> para que no altere los indicadores de adherencia.
              </p>
            </div>
            <div>
              <label className="label">Observaciones *</label>
              <textarea rows={4} className="input resize-none"
                placeholder="Motivo por el que no se pudo realizar la medición..."
                {...register('observaciones')} />
              {errors.observaciones && <p className="text-xs text-red-600 mt-1">{errors.observaciones.message}</p>}
            </div>
            <div className="mt-4 max-w-xs">
              <label className="label">Estado</label>
              <select className="input" {...register('estado')}>
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En Proceso</option>
                <option value="validado">Validado</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>
          </div>
        )}

        {/* Resultado */}
        {!sinMedicion && (
        <div className="card p-5">
          <SH>Resultado y Clasificación</SH>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Resultado (RLU) *</label>
              <input type="number" min="0" step="0.01" className="input font-mono"
                placeholder="0" {...register('resultado')} />
              {errors.resultado && <p className="text-xs text-red-600 mt-1">{errors.resultado.message}</p>}
            </div>

            <div>
              <label className="label">Clasificación (automática)</label>
              {rango ? (
                <div className={`px-3 py-2 rounded-lg border text-sm font-semibold ${RANGO_STYLE[rango]}`}>
                  {rango}
                  <p className="text-xs font-normal mt-0.5 opacity-80">{RANGO_DESC[rango]}</p>
                </div>
              ) : (
                <div className="px-3 py-2 rounded-lg border border-white/70 bg-slate-50 text-sm text-slate-400">
                  Ingresa el resultado RLU para ver la clasificación
                </div>
              )}
            </div>

            <div>
              <label className="label">Estado</label>
              <select className="input" {...register('estado')}>
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En Proceso</option>
                <option value="validado">Validado</option>
                <option value="cerrado">Cerrado</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="label">Observaciones</label>
              <textarea rows={2} className="input resize-none"
                placeholder="Notas adicionales (opcional)..." {...register('observaciones')} />
            </div>
          </div>
        </div>
        )}

        {/* Documentos adjuntos */}
        <div className="card p-5">
          <SH>Documentos Adjuntos</SH>
          <FileUpload value={adjuntos} onChange={setAdjuntos} folder="luminometria" />
        </div>

        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            ⚠️ Error al guardar: {saveError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link to="/encuestas/luminometria" className="btn-secondary">Cancelar</Link>
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
