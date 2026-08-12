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
import { ArrowLeft, Save, BarChart3 } from 'lucide-react'
import { useLista } from '../../hooks/useLista'

const SERVICIOS_FALLBACK = ['HOSPITALIZACIÓN 2', 'HOSPITALIZACIÓN 7', 'HOSPITALIZACIÓN 8']

const CRITERIOS = [
  { name: 'criterio_1_cabecera',        label: 'Cabecera elevada 30–45°' },
  { name: 'criterio_2_higiene_oral',    label: 'Boca completamente limpia (higiene oral)' },
  { name: 'criterio_3_implementos',     label: 'Implementos de aseo disponibles' },
  { name: 'criterio_4_movilizacion',    label: 'Movilización temprana' },
  { name: 'criterio_5_riesgo_disfagia', label: 'Riesgo moderado-alto de disfagia y aspiración' },
]

const schema = z.object({
  fecha_registro:             z.string().min(1, 'Requerido'),
  servicio:                   z.string().min(1, 'Requerido'),
  documento_identificacion:   z.string().optional(),
  criterio_1_cabecera:        z.enum(['SI', 'NO', 'NA'], { errorMap: () => ({ message: 'Requerido' }) }),
  criterio_2_higiene_oral:    z.enum(['SI', 'NO', 'NA'], { errorMap: () => ({ message: 'Requerido' }) }),
  criterio_3_implementos:     z.enum(['SI', 'NO', 'NA'], { errorMap: () => ({ message: 'Requerido' }) }),
  criterio_4_movilizacion:    z.enum(['SI', 'NO', 'NA'], { errorMap: () => ({ message: 'Requerido' }) }),
  criterio_5_riesgo_disfagia: z.enum(['SI', 'NO', 'NA'], { errorMap: () => ({ message: 'Requerido' }) }),
  observacion_no_cumplimiento: z.string().optional(),
  estado:                     z.string().default('pendiente'),
})

function SH({ children }) {
  return (
    <div className="px-3.5 py-2.5 bg-brand-gradient border-l-4 border-accent-400 rounded-r-xl shadow-neu-sm mb-4">
      <h3 className="text-sm font-semibold text-white tracking-wide">{children}</h3>
    </div>
  )
}

const OPT_STYLE = {
  SI: 'bg-emerald-100 border-emerald-300 text-emerald-800',
  NO: 'bg-red-100 border-red-300 text-red-800',
  NA: 'bg-slate-200 border-slate-300 text-slate-700',
}

function RadioSiNoNa({ name, label, register, error, disabled, selected }) {
  return (
    <div className="p-3 rounded-lg border border-slate-200">
      <p className="text-sm text-slate-700 mb-2">{label}</p>
      <div className="flex gap-2">
        {['SI', 'NO', 'NA'].map(opt => (
          <label key={opt} className="flex-1">
            <input type="radio" value={opt} className="sr-only" disabled={disabled} {...register(name)} />
            <span className={`block text-center text-xs font-semibold py-1.5 rounded-lg border cursor-pointer transition-colors
              ${selected === opt ? OPT_STYLE[opt] : 'border-slate-200 text-slate-500'}`}
            >
              {opt === 'NA' ? 'N/A' : opt}
            </span>
          </label>
        ))}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error.message}</p>}
    </div>
  )
}

export default function AdherenciaPrevencionNcForm() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user, rol, puedeCapturar: puedeCapturarModulo } = useAuth()
  const puedeCapturar = puedeCapturarModulo('adherencia_prevencion_nc')
  const isEdit   = Boolean(id)
  const [saving,    setSaving]    = useState(false)
  const [adjuntos,  setAdjuntos]  = useState([])
  const [saveError, setSaveError] = useState('')
  const [soloLectura, setSoloLectura] = useState(false)
  const [estadoReg,   setEstadoReg]   = useState(null)
  const [loaded,      setLoaded]      = useState(!isEdit)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fecha_registro: new Date().toISOString().slice(0, 10),
      servicio: 'HOSPITALIZACIÓN 2',
      estado: 'pendiente',
    },
  })

  const servicios = useLista('adherencia_nc_servicio', SERVICIOS_FALLBACK)

  useEffect(() => {
    if (isEdit) {
      supabase.from('encuesta_adherencia_prevencion_nc').select('*').eq('id', id).single()
        .then(({ data }) => {
          if (data) {
            reset(data)
            setAdjuntos(data.adjuntos ?? [])
            setEstadoReg(data.estado)
            setSoloLectura(!esEditable(data.estado, rol) || !puedeCapturar)
          }
          setLoaded(true)
        })
    }
  }, [id])

  async function onSubmit(values) {
    setSaving(true)
    setSaveError('')
    const payload = { ...values, adjuntos, registrado_por: isEdit ? undefined : user?.id }
    const { error } = await guardarEncuesta('encuesta_adherencia_prevencion_nc', payload, isEdit ? id : undefined)
    if (error) {
      setSaveError(error)
      setSaving(false)
      return
    }
    navigate('/encuestas/adherencia-prevencion-nc')
  }

  if (!loaded) return (
    <div className="p-8 flex justify-center">
      <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!isEdit && !puedeCapturar) {
    return <SinPermisoCaptura volverTo="/encuestas/adherencia-prevencion-nc" />
  }

  return (
    <div className="p-6 lg:p-8 animate-fade-in max-w-2xl">
      <div className="flex items-start gap-3 mb-6">
        <Link to="/encuestas/adherencia-prevencion-nc"
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors mt-1">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="page-title">{isEdit ? 'Editar' : 'Nuevo'} Registro — Adherencia Prevención NC</h1>
          <p className="page-subtitle">Neumonía clínica / intrahospitalaria</p>
        </div>
        <Link to="/encuestas/adherencia-prevencion-nc/dashboard"
          className="inline-flex items-center gap-1.5 btn-secondary text-xs mt-1">
          <BarChart3 className="w-3.5 h-3.5" /> Dashboard
        </Link>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {soloLectura && <BannerSoloLectura estado={estadoReg} />}

        <fieldset disabled={soloLectura} className="space-y-5 min-w-0">

        <div className="card p-5">
          <SH>Datos Generales</SH>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha de Registro *</label>
              <input type="date" className="input" {...register('fecha_registro')} />
              {errors.fecha_registro && <p className="text-xs text-red-600 mt-1">{errors.fecha_registro.message}</p>}
            </div>
            <div>
              <label className="label">Servicio *</label>
              <select className="input" {...register('servicio')}>
                {servicios.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.servicio && <p className="text-xs text-red-600 mt-1">{errors.servicio.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="label">Identificación del Paciente</label>
              <input type="text" className="input" placeholder="Documento de identidad"
                {...register('documento_identificacion')} />
            </div>
          </div>
        </div>

        <div className="card p-5">
          <SH>Paquete de Medidas NC</SH>
          <div className="space-y-3">
            {CRITERIOS.map(c => (
              <RadioSiNoNa key={c.name} name={c.name} label={c.label}
                register={register} error={errors[c.name]} disabled={soloLectura} selected={watch(c.name)} />
            ))}
          </div>
        </div>

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

        <div className="card p-5">
          <SH>Documentos Adjuntos</SH>
          <FileUpload value={adjuntos} onChange={setAdjuntos} folder="adherencia-prevencion-nc" />
        </div>

        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            ⚠️ Error al guardar: {saveError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link to="/encuestas/adherencia-prevencion-nc" className="btn-secondary">Cancelar</Link>
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
