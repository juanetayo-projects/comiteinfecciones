import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Save } from 'lucide-react'

const SERVICIOS_AISLAMIENTO = [
  'HOSPITALIZACIÓN 2', 'HOSPITALIZACIÓN', 'URGENCIAS', 'UCI',
]

const PROFESIONALES = [
  'AUXILIAR', 'ENFERMERA (O)', 'MEDICO', 'MEDICO ESPECIALISTA',
  'FISIOTERAPEUTA', 'TERAPEUTA RESPIRATORIO', 'INTERNO', 'NUTRICIONISTA',
]

const TIPOS_AISLAMIENTO = ['CONTACTO', 'COHORTIZACIÓN', 'GOTAS', 'VIA AEREA']

const TIPOS_TAPABOCA = ['QUIRURGICO', 'ALTA EFICIENCIA', 'NO', 'NA']

const CRITERIOS_BOOL = [
  { name: 'tiene_afiche',          label: 'Tiene Afiche' },
  { name: 'bisuteria',             label: 'Bisutería' },
  { name: 'higiene_manos_previo',  label: 'Higiene de Manos Previo' },
  { name: 'uso_bata',              label: 'Uso de Bata' },
  { name: 'uso_gorro',             label: 'Uso de Gorro' },
  { name: 'uso_guante',            label: 'Uso de Guante' },
  { name: 'cuelga_bata',           label: 'Cuelga Bata' },
  { name: 'higiene_manos_despues', label: 'Higiene de Manos Después' },
]

const schema = z.object({
  fecha_registro:          z.string().min(1, 'Requerido'),
  servicio:                z.string().min(1, 'Requerido'),
  profesional:             z.string().min(1, 'Requerido'),
  tipo_aislamiento:        z.string().min(1, 'Requerido'),
  tiene_afiche:            z.boolean().default(false),
  bisuteria:               z.boolean().default(false),
  higiene_manos_previo:    z.boolean().default(false),
  uso_bata:                z.boolean().default(false),
  tipo_tapaboca:           z.string().optional(),
  uso_gorro:               z.boolean().default(false),
  uso_guante:              z.boolean().default(false),
  cuelga_bata:             z.boolean().default(false),
  higiene_manos_despues:   z.boolean().default(false),
  adherencia:              z.string().optional(),
  nombre_evaluado:         z.string().optional(),
  observacion:             z.string().optional(),
  estado:                  z.string().default('pendiente'),
})

export default function AislamientoForm() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEdit   = Boolean(id)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fecha_registro: new Date().toISOString().slice(0, 10), estado: 'pendiente' },
  })

  useEffect(() => {
    if (isEdit) {
      supabase.from('encuesta_aislamiento').select('*').eq('id', id).single()
        .then(({ data }) => { if (data) reset(data) })
    }
  }, [id])

  async function onSubmit(values) {
    setSaving(true)
    const payload = { ...values, registrado_por: user?.id }
    if (isEdit) {
      await supabase.from('encuesta_aislamiento').update(payload).eq('id', id)
    } else {
      await supabase.from('encuesta_aislamiento').insert([payload])
    }
    navigate('/encuestas/aislamiento')
  }

  return (
    <div className="p-6 lg:p-8 animate-fade-in max-w-3xl">
      <div className="mb-6">
        <Link to="/encuestas/aislamiento"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a registros
        </Link>
        <h1 className="page-title">{isEdit ? 'Editar' : 'Nueva'} Encuesta — Aislamiento</h1>
        <p className="page-subtitle">Protocolo de adherencia a medidas de aislamiento hospitalario</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Datos generales */}
        <div className="card p-5">
          <h3 className="section-title mb-4">Datos Generales</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha de Registro *</label>
              <input type="date" className="input" {...register('fecha_registro')} />
              {errors.fecha_registro && <p className="text-xs text-red-600 mt-1">{errors.fecha_registro.message}</p>}
            </div>
            <div>
              <label className="label">Servicio *</label>
              <select className="input" {...register('servicio')}>
                <option value="">Seleccionar...</option>
                {SERVICIOS_AISLAMIENTO.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.servicio && <p className="text-xs text-red-600 mt-1">{errors.servicio.message}</p>}
            </div>
            <div>
              <label className="label">Profesional *</label>
              <select className="input" {...register('profesional')}>
                <option value="">Seleccionar...</option>
                {PROFESIONALES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {errors.profesional && <p className="text-xs text-red-600 mt-1">{errors.profesional.message}</p>}
            </div>
            <div>
              <label className="label">Tipo de Aislamiento *</label>
              <select className="input" {...register('tipo_aislamiento')}>
                <option value="">Seleccionar...</option>
                {TIPOS_AISLAMIENTO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.tipo_aislamiento && <p className="text-xs text-red-600 mt-1">{errors.tipo_aislamiento.message}</p>}
            </div>
          </div>
        </div>

        {/* Criterios de adherencia */}
        <div className="card p-5">
          <h3 className="section-title mb-4">Criterios de Adherencia</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CRITERIOS_BOOL.map(c => (
              <label key={c.name}
                className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-colors">
                <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600" {...register(c.name)} />
                <span className="text-sm text-slate-700">{c.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 max-w-xs">
            <label className="label">Tipo de Tapaboca</label>
            <select className="input" {...register('tipo_tapaboca')}>
              <option value="">Seleccionar...</option>
              {TIPOS_TAPABOCA.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Resultado y cierre */}
        <div className="card p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Adherencia *</label>
              <select className="input" {...register('adherencia')}>
                <option value="">Seleccionar...</option>
                <option value="CUMPLE">CUMPLE</option>
                <option value="NO CUMPLE">NO CUMPLE</option>
              </select>
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
            <div>
              <label className="label">Nombre del Evaluado</label>
              <input className="input" placeholder="Nombre del paciente / persona evaluada" {...register('nombre_evaluado')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Observación</label>
              <textarea rows={3} className="input resize-none"
                placeholder="Notas adicionales..." {...register('observacion')} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Link to="/encuestas/aislamiento" className="btn-secondary">Cancelar</Link>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando...</>
              : <><Save className="w-4 h-4" /> {isEdit ? 'Actualizar' : 'Guardar'}</>}
          </button>
        </div>
      </form>
    </div>
  )
}
