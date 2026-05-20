import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { ArrowLeft, Save } from 'lucide-react'

const CRITERIOS = [
  { name: 'criterio_1_rotulo',       label: 'Rotulación correcta del acceso venoso' },
  { name: 'criterio_2_fijacion',     label: 'Fijación adecuada del catéter' },
  { name: 'criterio_3_mantenimiento',label: 'Mantenimiento del sitio de inserción' },
  { name: 'criterio_4_pertinencia',  label: 'Pertinencia del acceso venoso' },
  { name: 'criterio_5_educacion',    label: 'Educación al paciente / familiar' },
  { name: 'lista_chequeo_cvc',       label: 'Lista de chequeo CVC completada' },
]

const schema = z.object({
  fecha_registro:             z.string().min(1, 'Requerido'),
  semana_mes:                 z.coerce.number().optional(),
  ubicacion_cama:             z.string().min(1, 'Requerido'),
  num_accesos:                z.coerce.number().min(0).default(1),
  cc:                         z.string().optional(),
  criterio_1_rotulo:          z.boolean().default(false),
  criterio_2_fijacion:        z.boolean().default(false),
  criterio_3_mantenimiento:   z.boolean().default(false),
  criterio_4_pertinencia:     z.boolean().default(false),
  criterio_5_educacion:       z.boolean().default(false),
  lista_chequeo_cvc:          z.boolean().default(false),
  observacion_no_cumplimiento: z.string().optional(),
  estado:                     z.string().default('pendiente'),
})

export default function AccesoVenosoForm() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEdit   = Boolean(id)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fecha_registro: new Date().toISOString().slice(0, 10),
      num_accesos: 1, estado: 'pendiente',
    },
  })

  useEffect(() => {
    if (isEdit) {
      supabase.from('encuesta_acceso_venoso').select('*').eq('id', id).single()
        .then(({ data }) => { if (data) reset(data) })
    }
  }, [id])

  async function onSubmit(values) {
    setSaving(true)
    const payload = { ...values, registrado_por: user?.id }
    if (isEdit) {
      await supabase.from('encuesta_acceso_venoso').update(payload).eq('id', id)
    } else {
      await supabase.from('encuesta_acceso_venoso').insert([payload])
    }
    navigate('/encuestas/acceso-venoso')
  }

  return (
    <div className="p-6 lg:p-8 animate-fade-in max-w-2xl">
      <div className="mb-6">
        <Link to="/encuestas/acceso-venoso"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a registros
        </Link>
        <h1 className="page-title">{isEdit ? 'Editar' : 'Nuevo'} Registro — Acceso Venoso Periférico</h1>
        <p className="page-subtitle">Vigilancia y criterios de calidad del catéter periférico (AVP)</p>
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
            <label className="label">N° de Accesos</label>
            <input type="number" min="0" className="input" {...register('num_accesos')} />
          </div>
          <div>
            <label className="label">C.C. del Paciente</label>
            <input className="input" placeholder="Número de documento" {...register('cc')} />
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
          <Link to="/encuestas/acceso-venoso" className="btn-secondary">Cancelar</Link>
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
