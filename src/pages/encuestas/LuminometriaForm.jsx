import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { SERVICIOS } from '../../lib/utils'
import { ArrowLeft, Save } from 'lucide-react'

const schema = z.object({
  fecha_registro:    z.string().min(1, 'Requerido'),
  servicio_evaluado: z.string().min(1, 'Requerido'),
  objeto:            z.string().min(1, 'Requerido'),
  resultado:         z.coerce.number({ required_error: 'Requerido' }).min(0, 'Debe ser ≥ 0'),
  estado:            z.string().default('pendiente'),
})

function calcRango(rlu) {
  const n = Number(rlu)
  if (isNaN(n) || rlu === '' || rlu === undefined) return null
  if (n < 100)  return 'Aceptable'
  if (n <= 500) return 'Aceptable Marginal'
  return 'Inaceptable'
}

const RANGO_STYLE = {
  'Aceptable':          'bg-emerald-50 text-emerald-800 border-emerald-200',
  'Aceptable Marginal': 'bg-yellow-50  text-yellow-800  border-yellow-200',
  'Inaceptable':        'bg-red-50     text-red-800     border-red-200',
}
const RANGO_DESC = {
  'Aceptable':          '< 100 RLU — Superficie limpia',
  'Aceptable Marginal': '100 – 500 RLU — Requiere acción',
  'Inaceptable':        '> 500 RLU — Limpieza inmediata',
}

export default function LuminometriaForm() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { user }   = useAuth()
  const isEdit     = Boolean(id)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fecha_registro: new Date().toISOString().slice(0, 10), estado: 'pendiente' },
  })

  const rlu   = watch('resultado')
  const rango = calcRango(rlu)

  useEffect(() => {
    if (isEdit) {
      supabase.from('encuesta_luminometria').select('*').eq('id', id).single()
        .then(({ data }) => { if (data) reset(data) })
    }
  }, [id])

  async function onSubmit(values) {
    setSaving(true)
    const payload = { ...values, rango: rango ?? '', registrado_por: user?.id }
    if (isEdit) {
      await supabase.from('encuesta_luminometria').update(payload).eq('id', id)
    } else {
      await supabase.from('encuesta_luminometria').insert([payload])
    }
    navigate('/encuestas/luminometria')
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

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
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
              {SERVICIOS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.servicio_evaluado && <p className="text-xs text-red-600 mt-1">{errors.servicio_evaluado.message}</p>}
          </div>

          <div className="sm:col-span-2">
            <label className="label">Objeto / Superficie evaluada *</label>
            <input className="input" placeholder="Ej: Mesa de noche, Baranda de cama, Monitor, Teclado..." {...register('objeto')} />
            {errors.objeto && <p className="text-xs text-red-600 mt-1">{errors.objeto.message}</p>}
          </div>

          <div>
            <label className="label">Resultado (RLU) *</label>
            <input type="number" min="0" step="0.01" className="input font-mono"
              placeholder="0" {...register('resultado')} />
            {errors.resultado && <p className="text-xs text-red-600 mt-1">{errors.resultado.message}</p>}
          </div>

          <div>
            <label className="label">Clasificación (automática)</label>
            {rango ? (
              <div className={`px-3 py-2 rounded-lg border text-sm font-medium ${RANGO_STYLE[rango]}`}>
                {rango}
                <p className="text-xs font-normal mt-0.5 opacity-80">{RANGO_DESC[rango]}</p>
              </div>
            ) : (
              <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-400">
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
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <Link to="/encuestas/luminometria" className="btn-secondary">Cancelar</Link>
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
