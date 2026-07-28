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
import { ArrowLeft, Save, BarChart3 } from 'lucide-react'
import { useLista } from '../../hooks/useLista'

const SERVICIOS_DEFAULT = [
  'ATENCIÓN AMBULATORIA', 'BRILLA ASEO', 'CIRUGÍA', 'HEMODINAMIA',
  'HOSPITALIZACIÓN 2', 'HOSPITALIZACIÓN 7', 'HOSPITALIZACIÓN 8', 'HOSPITALIZACIÓN PARCIAL',
  'IMAGENES', 'LABORATORIO', 'REHABILITACIÓN',
  'UCI', 'UCIN', 'URGENCIAS ADULTO', 'URGENCIAS PEDIATRICAS',
]

const CRITERIOS = [
  { name: 'criterio_1_cabecera',          label: 'Cabecera elevada 30–45°' },
  { name: 'criterio_2_higiene_oral',      label: 'Higiene oral con clorhexidina' },
  { name: 'criterio_3_implementos',       label: 'Implementos disponibles y adecuados' },
  { name: 'criterio_4_lista_chequeo_nav', label: 'Lista de chequeo NAV completada' },
]

function calcSemanaMes(fechaStr) {
  if (!fechaStr) return null
  return Math.ceil(new Date(fechaStr + 'T12:00:00').getDate() / 7)
}

const schema = z.object({
  fecha_registro:               z.string().min(1, 'Requerido'),
  ubicacion_cama:               z.string().min(1, 'Requerido'),
  num_casos:                    z.coerce.number().min(0).default(1),
  observaciones:                z.string().optional(),
  criterio_1_cabecera:          z.boolean().default(false),
  criterio_2_higiene_oral:      z.boolean().default(false),
  criterio_3_implementos:       z.boolean().default(false),
  criterio_4_lista_chequeo_nav: z.boolean().default(false),
  observacion_no_cumplimiento:  z.string().optional(),
  estado:                       z.string().default('pendiente'),
})

function SH({ children }) {
  return (
    <div className="px-3.5 py-2.5 bg-brand-gradient border-l-4 border-accent-400 rounded-r-xl shadow-neu-sm mb-4">
      <h3 className="text-sm font-semibold text-white tracking-wide">{children}</h3>
    </div>
  )
}

export default function PrevencionNeumoniaForm() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user, rol } = useAuth()
  const isEdit   = Boolean(id)
  const [saving,    setSaving]    = useState(false)
  const [adjuntos,  setAdjuntos]  = useState([])
  const [saveError, setSaveError] = useState('')
  // Un registro validado/cerrado se abre en modo consulta (ver RLS: puede_editar_encuesta)
  const [soloLectura, setSoloLectura] = useState(false)
  const [estadoReg,   setEstadoReg]   = useState(null)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fecha_registro: new Date().toISOString().slice(0, 10),
      num_casos: 1, estado: 'pendiente',
    },
  })

  const servicios = useLista('servicio', SERVICIOS_DEFAULT)
  const fechaReg    = watch('fecha_registro')
  const semanaMes   = calcSemanaMes(fechaReg)

  useEffect(() => {
    if (isEdit) {
      supabase.from('encuesta_prevencion_neumonia').select('*').eq('id', id).single()
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
      // semana_mes is a GENERATED ALWAYS AS column — DB computes it from fecha_registro
      adjuntos,
      registrado_por: isEdit ? undefined : user?.id,
    }
    const { error } = await guardarEncuesta('encuesta_prevencion_neumonia', payload, isEdit ? id : undefined)
    if (error) {
      setSaveError(error)
      setSaving(false)
      return
    }
    navigate('/encuestas/prevencion-neumonia')
  }

  return (
    <div className="p-6 lg:p-8 animate-fade-in max-w-2xl">
      <div className="flex items-start gap-3 mb-6">
        <Link to="/encuestas/prevencion-neumonia"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors mt-1">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">{isEdit ? 'Editar' : 'Nuevo'} Registro — Prevención Neumonía</h1>
          <p className="page-subtitle">Paquete de medidas para prevención de neumonía asociada a ventilación</p>
        </div>
        <Link to="/encuestas/prevencion-neumonia/dashboard"
          className="inline-flex items-center gap-1.5 btn-secondary text-xs mt-1">
          <BarChart3 className="w-3.5 h-3.5" /> Dashboard
        </Link>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {soloLectura && <BannerSoloLectura estado={estadoReg} />}

        <fieldset disabled={soloLectura} className="space-y-5 min-w-0">

        {/* Datos generales */}
        <div className="card p-5">
          <SH>Datos Generales</SH>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha de Registro *</label>
              <input type="date" className="input" {...register('fecha_registro')} />
              {errors.fecha_registro && <p className="text-xs text-red-600 mt-1">{errors.fecha_registro.message}</p>}
            </div>
            <div>
              <label className="label">Semana del Mes (automático)</label>
              <div className="input bg-slate-50 flex items-center gap-2">
                {semanaMes
                  ? <><span className="text-2xl font-bold text-brand-700">{semanaMes}</span><span className="text-xs text-slate-400">/ 5</span></>
                  : <span className="text-slate-400 text-sm">Se calculará al seleccionar la fecha</span>
                }
              </div>
            </div>
            <div>
              <label className="label">Servicio *</label>
              <select className="input" {...register('ubicacion_cama')}>
                <option value="">Seleccionar...</option>
                {servicios.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.ubicacion_cama && <p className="text-xs text-red-600 mt-1">{errors.ubicacion_cama.message}</p>}
            </div>
            <div>
              <label className="label">N° de Casos</label>
              <input type="number" min="0" className="input" {...register('num_casos')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Observaciones</label>
              <textarea rows={3} className="input resize-none"
                placeholder="Observaciones generales del registro..." {...register('observaciones')} />
            </div>
          </div>
        </div>

        {/* Paquete de medidas */}
        <div className="card p-5">
          <SH>Paquete de Medidas NAV</SH>
          <div className="space-y-2">
            {CRITERIOS.map(c => (
              <label key={c.name}
                className="flex items-center gap-2.5 p-3 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                <input type="checkbox" className="w-4 h-4 rounded accent-brand-600" {...register(c.name)} />
                <span className="text-sm text-slate-700">{c.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Observaciones y estado */}
        <div className="card p-5">
          <SH>Observaciones y Estado</SH>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Observación de No Cumplimiento</label>
              <textarea rows={3} className="input resize-none"
                placeholder="Describe los criterios que no se cumplen..." {...register('observacion_no_cumplimiento')} />
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
          </div>
        </div>

        {/* Documentos adjuntos */}
        <div className="card p-5">
          <SH>Documentos Adjuntos</SH>
          <FileUpload value={adjuntos} onChange={setAdjuntos} folder="prevencion-neumonia" />
        </div>

        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            ⚠️ Error al guardar: {saveError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link to="/encuestas/prevencion-neumonia" className="btn-secondary">Cancelar</Link>
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
