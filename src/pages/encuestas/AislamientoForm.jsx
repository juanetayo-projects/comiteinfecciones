import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { SERVICIOS } from '../../lib/utils'
import { ArrowLeft, Save } from 'lucide-react'

const schema = z.object({
  fecha_registro:    z.string().min(1, 'Requerido'),
  servicio:          z.string().min(1, 'Requerido'),
  profesional:       z.string().min(2, 'Requerido'),
  tipo_aislamiento:  z.string().min(1, 'Requerido'),
  nombre_evaluado:   z.string().optional(),
  uso_guantes:       z.boolean().default(false),
  uso_mascarilla:    z.boolean().default(false),
  uso_bata:          z.boolean().default(false),
  uso_gafas:         z.boolean().default(false),
  lavado_manos:      z.boolean().default(false),
  señalizacion:      z.boolean().default(false),
  habitacion_individual: z.boolean().default(false),
  adherencia:        z.enum(['cumple','no_cumple']),
  observaciones:     z.string().optional(),
  estado:            z.string().default('pendiente'),
})

const TIPOS_AISLAMIENTO = [
  'Aislamiento de Contacto',
  'Aislamiento Respiratorio por Gotas',
  'Aislamiento Respiratorio por Aerosoles',
  'Aislamiento Inverso/Protector',
  'Aislamiento Combinado',
]

const CRITERIOS = [
  { name: 'uso_guantes',           label: 'Uso de guantes' },
  { name: 'uso_mascarilla',        label: 'Uso de mascarilla' },
  { name: 'uso_bata',              label: 'Uso de bata' },
  { name: 'uso_gafas',             label: 'Uso de gafas/careta' },
  { name: 'lavado_manos',          label: 'Lavado de manos' },
  { name: 'señalizacion',          label: 'Señalización de habitación' },
  { name: 'habitacion_individual', label: 'Habitación individual' },
]

export default function AislamientoForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = Boolean(id)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fecha_registro: new Date().toISOString().slice(0,10), estado: 'pendiente' },
  })

  useEffect(() => {
    if (isEdit) {
      supabase.from('encuesta_aislamiento').select('*').eq('id', id).single()
        .then(({ data }) => { if (data) reset(data) })
    }
  }, [id])

  async function onSubmit(values) {
    setSaving(true)
    if (isEdit) {
      await supabase.from('encuesta_aislamiento').update(values).eq('id', id)
    } else {
      await supabase.from('encuesta_aislamiento').insert([values])
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

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
        {/* Datos generales */}
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
              {SERVICIOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.servicio && <p className="text-xs text-red-600 mt-1">{errors.servicio.message}</p>}
          </div>
          <div>
            <label className="label">Profesional Evaluador *</label>
            <input className="input" placeholder="Nombre del profesional" {...register('profesional')} />
            {errors.profesional && <p className="text-xs text-red-600 mt-1">{errors.profesional.message}</p>}
          </div>
          <div>
            <label className="label">Nombre del Paciente / Evaluado</label>
            <input className="input" placeholder="Opcional" {...register('nombre_evaluado')} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Tipo de Aislamiento *</label>
            <select className="input" {...register('tipo_aislamiento')}>
              <option value="">Seleccionar...</option>
              {TIPOS_AISLAMIENTO.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {errors.tipo_aislamiento && <p className="text-xs text-red-600 mt-1">{errors.tipo_aislamiento.message}</p>}
          </div>
        </div>

        {/* Criterios */}
        <div>
          <h3 className="section-title mb-3">Criterios de Adherencia</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CRITERIOS.map(c => (
              <label key={c.name} className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600" {...register(c.name)} />
                <span className="text-sm text-slate-700">{c.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Adherencia y estado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Adherencia Global *</label>
            <select className="input" {...register('adherencia')}>
              <option value="">Seleccionar...</option>
              <option value="cumple">Cumple</option>
              <option value="no_cumple">No Cumple</option>
            </select>
            {errors.adherencia && <p className="text-xs text-red-600 mt-1">{errors.adherencia.message}</p>}
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
            <textarea rows={3} className="input resize-none" placeholder="Notas adicionales..." {...register('observaciones')} />
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
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
