import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { SERVICIOS, QUIROFANOS } from '../../lib/utils'
import { ArrowLeft, Save } from 'lucide-react'

const OPC = [
  { value: 'cumple',    label: 'Cumple' },
  { value: 'no_cumple', label: 'No Cumple' },
  { value: 'na',        label: 'N/A' },
]

function SC({ label, name, register, error }) {
  return (
    <div>
      <label className="label">{label}</label>
      <select className="input" {...register(name)}>
        <option value="">—</option>
        {OPC.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs text-red-600 mt-1">{error.message}</p>}
    </div>
  )
}

const ESPECIALIDADES = [
  'Cirugía General','Ortopedia','Ginecología','Urología',
  'Neurocirugía','Cirugía Cardiovascular','Cirugía Pediátrica',
  'Otorrinolaringología','Oftalmología','Cirugía Plástica','Otra',
]

const schema = z.object({
  fecha_registro:                z.string().min(1, 'Requerido'),
  quirofano:                     z.string().min(1, 'Requerido'),
  servicio:                      z.string().min(1, 'Requerido'),
  especialidad:                  z.string().optional(),
  procedimiento:                 z.string().optional(),
  profesional:                   z.string().min(2, 'Requerido'),
  jabones_toallas:               z.string().optional(),
  guardianes_fijos_rotulados:    z.string().optional(),
  buena_senalizacion:            z.string().optional(),
  puertas_cerradas:              z.string().optional(),
  no_excede_personas:            z.string().optional(),
  desinfeccion_quirofano:        z.string().optional(),
  lista_chequeo_cx_segura:       z.string().optional(),
  coloca_antibiotico_antes:      z.string().optional(),
  medicamento_profilactico:      z.string().optional(),
  hora_administracion:           z.string().optional(),
  hora_inicio_cirugia:           z.string().optional(),
  cumplimiento_profilaxis:       z.string().optional(),
  refuerzo_antibiotico_prolongada: z.string().optional(),
  hora_finalizacion_cirugia:     z.string().optional(),
  lavado_manos_quirurgico:       z.string().optional(),
  epp_completo:                  z.string().optional(),
  retira_accesorios:             z.string().optional(),
  segregacion_residuos:          z.string().optional(),
  desinfeccion_sitio_operatorio: z.string().optional(),
  rotulo_accesos_venosos:        z.string().optional(),
  rotulos_medicamentos:          z.string().optional(),
  estado:                        z.string().default('pendiente'),
})

export default function RondaCirugiaForm() {
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
      supabase.from('encuesta_ronda_cirugia').select('*').eq('id', id).single()
        .then(({ data }) => { if (data) reset(data) })
    }
  }, [id])

  async function onSubmit(values) {
    setSaving(true)
    const payload = { ...values, registrado_por: user?.id }
    if (isEdit) {
      await supabase.from('encuesta_ronda_cirugia').update(payload).eq('id', id)
    } else {
      await supabase.from('encuesta_ronda_cirugia').insert([payload])
    }
    navigate('/encuestas/ronda-cirugia')
  }

  return (
    <div className="p-6 lg:p-8 animate-fade-in max-w-4xl">
      <div className="mb-6">
        <Link to="/encuestas/ronda-cirugia"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a registros
        </Link>
        <h1 className="page-title">{isEdit ? 'Editar' : 'Nueva'} Ronda — Cirugía</h1>
        <p className="page-subtitle">Control de infecciones y profilaxis antibiótica en área quirúrgica</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Identificación */}
        <div className="card p-5">
          <h3 className="section-title mb-4">Identificación del Procedimiento</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha *</label>
              <input type="date" className="input" {...register('fecha_registro')} />
              {errors.fecha_registro && <p className="text-xs text-red-600 mt-1">{errors.fecha_registro.message}</p>}
            </div>
            <div>
              <label className="label">Quirófano *</label>
              <select className="input" {...register('quirofano')}>
                <option value="">Seleccionar...</option>
                {QUIROFANOS.map(q => <option key={q} value={q}>{q}</option>)}
              </select>
              {errors.quirofano && <p className="text-xs text-red-600 mt-1">{errors.quirofano.message}</p>}
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
              <label className="label">Especialidad</label>
              <select className="input" {...register('especialidad')}>
                <option value="">Seleccionar...</option>
                {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Procedimiento</label>
              <input className="input" placeholder="Nombre del procedimiento" {...register('procedimiento')} />
            </div>
            <div>
              <label className="label">Profesional Evaluador *</label>
              <input className="input" placeholder="Nombre del evaluador" {...register('profesional')} />
              {errors.profesional && <p className="text-xs text-red-600 mt-1">{errors.profesional.message}</p>}
            </div>
          </div>
        </div>

        {/* Condiciones del área */}
        <div className="card p-5">
          <h3 className="section-title mb-4">Condiciones del Área Quirúrgica</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SC label="Jabones y toallas disponibles"             name="jabones_toallas"            register={register} error={errors.jabones_toallas} />
            <SC label="Guardianes fijos y rotulados"              name="guardianes_fijos_rotulados" register={register} error={errors.guardianes_fijos_rotulados} />
            <SC label="Buena señalización"                        name="buena_senalizacion"         register={register} error={errors.buena_senalizacion} />
            <SC label="Puertas cerradas durante la cirugía"       name="puertas_cerradas"           register={register} error={errors.puertas_cerradas} />
            <SC label="No excede el número de personas"           name="no_excede_personas"         register={register} error={errors.no_excede_personas} />
            <SC label="Desinfección del quirófano previa"         name="desinfeccion_quirofano"     register={register} error={errors.desinfeccion_quirofano} />
            <SC label="Lista de chequeo cirugía segura"           name="lista_chequeo_cx_segura"    register={register} error={errors.lista_chequeo_cx_segura} />
          </div>
        </div>

        {/* Profilaxis antibiótica */}
        <div className="card p-5">
          <h3 className="section-title mb-4">Profilaxis Antibiótica</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SC label="Antibiótico colocado antes de incisión"    name="coloca_antibiotico_antes"        register={register} error={errors.coloca_antibiotico_antes} />
            <div>
              <label className="label">Medicamento Profiláctico</label>
              <input className="input" placeholder="Nombre del antibiótico" {...register('medicamento_profilactico')} />
            </div>
            <div>
              <label className="label">Hora Administración</label>
              <input type="time" className="input" {...register('hora_administracion')} />
            </div>
            <div>
              <label className="label">Hora Inicio Cirugía</label>
              <input type="time" className="input" {...register('hora_inicio_cirugia')} />
            </div>
            <div>
              <label className="label">Hora Finalización Cirugía</label>
              <input type="time" className="input" {...register('hora_finalizacion_cirugia')} />
            </div>
            <SC label="Cumplimiento profilaxis"                   name="cumplimiento_profilaxis"         register={register} error={errors.cumplimiento_profilaxis} />
            <SC label="Refuerzo antibiótico en cirugía prolongada" name="refuerzo_antibiotico_prolongada" register={register} error={errors.refuerzo_antibiotico_prolongada} />
          </div>
        </div>

        {/* Prácticas del equipo */}
        <div className="card p-5">
          <h3 className="section-title mb-4">Prácticas del Equipo Quirúrgico</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SC label="Lavado de manos quirúrgico"                name="lavado_manos_quirurgico"         register={register} error={errors.lavado_manos_quirurgico} />
            <SC label="EPP completo"                              name="epp_completo"                    register={register} error={errors.epp_completo} />
            <SC label="Retira accesorios antes de la cirugía"     name="retira_accesorios"               register={register} error={errors.retira_accesorios} />
            <SC label="Segregación de residuos"                   name="segregacion_residuos"            register={register} error={errors.segregacion_residuos} />
            <SC label="Desinfección del sitio operatorio"         name="desinfeccion_sitio_operatorio"   register={register} error={errors.desinfeccion_sitio_operatorio} />
            <SC label="Rotulación de accesos venosos"             name="rotulo_accesos_venosos"          register={register} error={errors.rotulo_accesos_venosos} />
            <SC label="Rotulación de medicamentos"                name="rotulos_medicamentos"            register={register} error={errors.rotulos_medicamentos} />
          </div>
        </div>

        {/* Estado */}
        <div className="card p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <div className="flex items-center justify-end gap-3">
          <Link to="/encuestas/ronda-cirugia" className="btn-secondary">Cancelar</Link>
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
