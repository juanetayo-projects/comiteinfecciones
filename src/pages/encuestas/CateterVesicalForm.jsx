import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Save } from 'lucide-react'

const CRITERIOS = [
  { name: 'criterio_1_fijacion',            label: 'Fijación adecuada del catéter' },
  { name: 'criterio_2_posicion_bolsa',       label: 'Posición correcta de la bolsa recolectora' },
  { name: 'criterio_3_rotulacion',           label: 'Rotulación del catéter' },
  { name: 'criterio_4_indicacion',           label: 'Indicación vigente del catéter' },
  { name: 'criterio_5_flujo_continuo',       label: 'Flujo continuo y permeabilidad' },
  { name: 'criterio_6_lista_chequeo_sonda',  label: 'Lista de chequeo sonda vesical completada' },
  { name: 'tiene_irrigacion',               label: 'Tiene irrigación activa' },
]

const schema = z.object({
  fecha_registro:              z.string().min(1, 'Requerido'),
  semana_mes:                  z.coerce.number().optional(),
  ubicacion_cama:              z.string().min(1, 'Requerido'),
  num_casos:                   z.coerce.number().min(0).default(1),
  documento_identificacion:    z.string().optional(),
  criterio_1_fijacion:         z.boolean().default(false),
  criterio_2_posicion_bolsa:   z.boolean().default(false),
  criterio_3_rotulacion:       z.boolean().default(false),
  criterio_4_indicacion:       z.boolean().default(false),
  criterio_5_flujo_continuo:   z.boolean().default(false),
  criterio_6_lista_chequeo_sonda: z.boolean().default(false),
  tiene_irrigacion:            z.boolean().default(false),
  fecha_no_cumple_lista:       z.string().optional(),
  observacion_no_cumplimiento: z.string().optional(),
  estado:                      z.string().default('pendiente'),
})

export default function CateterVesicalForm() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEdit   = Boolean(id)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fecha_registro: new Date().toISOString().slice(0, 10),
      num_casos: 1, estado: 'pendiente',
    },
  })

  useEffect(() => {
    if (isEdit) {
      supabase.from('encuesta_cateter_vesical').select('*').eq('id', id).single()
        .then(({ data }) => { if (data) reset(data) })
    }
  }, [id])

  async function onSubmit(values) {
    setSaving(true)
    const payload = {
      ...values,
      fecha_no_cumple_lista: values.fecha_no_cumple_lista || null,
      registrado_por: user?.id,
    }
    if (isEdit) {
      await supabase.from('encuesta_cateter_vesical').update(payload).eq('id', id)
    } else {
      await supabase.from('encuesta_cateter_vesical').insert([payload])
    }
    navigate('/encuestas/cateter-vesical')
  }

  return (
    <div className="p-6 lg:p-8 animate-fade-in max-w-2xl">
      <div className="mb-6">
        <Link to="/encuestas/cateter-vesical"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a registros
        </Link>
        <h1 className="page-title">{isEdit ? 'Editar' : 'Nuevo'} Registro — Catéter Vesical</h1>
        <p className="page-subtitle">Vigilancia y criterios de calidad de la sonda vesical</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Fecha de Registro *</label>
            <input type="date" className="input" {...register('fecha_registro')} />
            {errors.fecha_registro && <p className="text-xs text-red-600 mt-1">{errors.fecha_registro.message}</p>}
          </div>
          <div>
            <label className="label">Semana del Mes</label>
            <input type="number" min="1" max="5" className="input" placeholder="1–5" {...register('semana_mes')} />
          </div>
          <div>
            <label className="label">Ubicación / Cama *</label>
            <input className="input" placeholder="Ej: UCI Adultos – Cama 3" {...register('ubicacion_cama')} />
            {errors.ubicacion_cama && <p className="text-xs text-red-600 mt-1">{errors.ubicacion_cama.message}</p>}
          </div>
          <div>
            <label className="label">N° de Casos</label>
            <input type="number" min="0" className="input" {...register('num_casos')} />
          </div>
          <div>
            <label className="label">Documento de Identificación</label>
            <input className="input" placeholder="Número de documento del paciente" {...register('documento_identificacion')} />
          </div>
        </div>

        <div>
          <h3 className="section-title mb-3">Criterios de Adherencia</h3>
          <div className="space-y-2">
            {CRITERIOS.map(c => (
              <label key={c.name}
                className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600" {...register(c.name)} />
                <span className="text-sm text-slate-700">{c.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Fecha de No Cumplimiento</label>
            <input type="date" className="input" {...register('fecha_no_cumple_lista')} />
          </div>
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

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <Link to="/encuestas/cateter-vesical" className="btn-secondary">Cancelar</Link>
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
