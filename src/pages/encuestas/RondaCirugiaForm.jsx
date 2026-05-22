import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import FileUpload from '../../components/common/FileUpload'
import { ArrowLeft, Save } from 'lucide-react'

// Listas extraídas del archivo Excel rondacirugia.xlsx — hoja "listas"
const QUIROFANOS = ['1', '2', '3', '4', '5']

const SERVICIOS_CX = ['CIRUGIA', 'HEMODINAMIA']

const ESPECIALIDADES = [
  'ANESTESIOLOGO',
  'ANGIOGRAFIA - HEMODINAMIA',
  'CX CARDIOVASCULAR',
  'CX DE COLUMNA',
  'CX DE MANO',
  'CX DE TORAX',
  'CX DERMATOLOGICA',
  'CX GENERAL',
  'CX GINECOLOGICA',
  'CX MAXILOFACIAL',
  'CX NEUROCIRUGIA',
  'CX NEUMOLOGIA',
  'CX NEUROLOGICA',
  'CX ORTOPEDIA',
  'CX OTORRINOLOGIA',
  'CX PEDIATRICA',
  'CX PLASTICA',
  'CX UROLOGICA',
  'CX VASCULAR',
  'ENDOSCOPIA',
  'N/A',
]

const PROFESIONALES_CX = [
  'ANESTESIOLOGO',
  'AUXILIAR ENFERMERIA',
  'CASA MEDICA',
  'CIRCULANTE',
  'CIRUJANO',
  'ENFERMERA',
  'INSTRUMENTADORA',
  'MEDICO GENERAL',
  'MEDICO AYUDANTE',
  'PERFUSIONISTA',
  'TECNICO RX',
]

const PROCEDIMIENTOS = [
  'CALCULO DE LA VESICULA BILIAR CON COLECISTITIS AGUDA',
  'CALCULO DE LA VESICULA BILIAR CON OTRA COLECISTITIS',
  'CISTOSTOMIA VIA ABIERTA',
  'DESBRIDAMIENTO, LAVADO Y LIMPIEZA METATARSOFALANGICA VIA ABIERTA',
  'FRACTURA DE LA DIAFISIS DEL FEMUR',
  'FRACTURA DE OTROS HUESOS DEL CRANEO Y DE LA CARA',
  'HERNIA INGUINAL UNILATERAL O NO ESPECIFICADA, SIN OBSTRUCION NI GANGRENA',
  'LAPAROTOMIA EXPLORATORIA',
  'LIMPIEZA Y DESBRIDAMIENTO QUIRURGICOS DE MUSCULOS, TENDONES Y FASCIA EN PIERNA',
  'NEFRECTOMIA RADICAL POR LAPAROSCOPIA',
  'OOFORECTOMIA',
  'OTRAS OSTEOMIELITIS AGUDAS',
  'OTRAS OSTEOMIELITIS CRONICAS',
  'REEMPLAZO DE LA VALVULA MITRAL',
  'REEMPLAZO PROTESICO TOTAL PRIMARIO SIMPLE DE CADERA',
  'TUMOR MALIGNO DE LA PROSTATA',
]

// Opciones de cumplimiento según Excel: CUMPLE / NO CUMPLE / NO APLICA / SIN DATO
const OPC = [
  { value: 'CUMPLE',    label: 'Cumple' },
  { value: 'NO CUMPLE', label: 'No Cumple' },
  { value: 'NO APLICA', label: 'No Aplica' },
  { value: 'SIN DATO',  label: 'Sin Dato' },
]

function SH({ children }) {
  return (
    <div className="px-3 py-2 bg-[#1a4fa0] border-l-4 border-white/40 rounded-r-md mb-4">
      <h3 className="text-sm font-semibold text-white tracking-wide">{children}</h3>
    </div>
  )
}

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

const schema = z.object({
  fecha_registro:                  z.string().min(1, 'Requerido'),
  quirofano:                       z.string().min(1, 'Requerido'),
  servicio:                        z.string().min(1, 'Requerido'),
  especialidad:                    z.string().optional(),
  procedimiento:                   z.string().optional(),
  profesional:                     z.string().min(1, 'Requerido'),
  identificacion_paciente:         z.string().optional(),
  nombre_paciente:                 z.string().optional(),
  jabones_toallas:                 z.string().optional(),
  guardianes_fijos_rotulados:      z.string().optional(),
  buena_senalizacion:              z.string().optional(),
  puertas_cerradas:                z.string().optional(),
  no_excede_personas:              z.string().optional(),
  desinfeccion_quirofano:          z.string().optional(),
  lista_chequeo_cx_segura:         z.string().optional(),
  coloca_antibiotico_antes:        z.string().optional(),
  medicamento_profilactico:        z.string().optional(),
  hora_administracion:             z.string().optional(),
  hora_inicio_cirugia:             z.string().optional(),
  cumplimiento_profilaxis:         z.string().optional(),
  refuerzo_antibiotico_prolongada: z.string().optional(),
  hora_finalizacion_cirugia:       z.string().optional(),
  lavado_manos_quirurgico:         z.string().optional(),
  epp_completo:                    z.string().optional(),
  retira_accesorios:               z.string().optional(),
  segregacion_residuos:            z.string().optional(),
  desinfeccion_sitio_operatorio:   z.string().optional(),
  rotulo_accesos_venosos:          z.string().optional(),
  rotulos_medicamentos:            z.string().optional(),
  estado:                          z.string().default('pendiente'),
}).refine(data => {
  if (data.hora_inicio_cirugia && data.hora_finalizacion_cirugia) {
    return data.hora_finalizacion_cirugia >= data.hora_inicio_cirugia
  }
  return true
}, {
  message: 'La hora de finalización no puede ser anterior a la de inicio',
  path: ['hora_finalizacion_cirugia'],
})

export default function RondaCirugiaForm() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEdit   = Boolean(id)
  const [saving,    setSaving]    = useState(false)
  const [adjuntos,  setAdjuntos]  = useState([])
  const [saveError, setSaveError] = useState('')

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fecha_registro: new Date().toISOString().slice(0, 10), estado: 'pendiente' },
  })

  useEffect(() => {
    if (isEdit) {
      supabase.from('encuesta_ronda_cirugia').select('*').eq('id', id).single()
        .then(({ data }) => {
          if (data) { reset(data); setAdjuntos(data.adjuntos ?? []) }
        })
    }
  }, [id])

  async function onSubmit(values) {
    setSaving(true)
    setSaveError('')
    const payload = { ...values, adjuntos, registrado_por: user?.id }
    const { error } = isEdit
      ? await supabase.from('encuesta_ronda_cirugia').update(payload).eq('id', id)
      : await supabase.from('encuesta_ronda_cirugia').insert([payload])
    if (error) {
      setSaveError(error.message)
      setSaving(false)
      return
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

        {/* Identificación del procedimiento */}
        <div className="card p-5">
          <SH>Identificación del Procedimiento</SH>
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
                {QUIROFANOS.map(q => <option key={q} value={q}>Quirófano {q}</option>)}
              </select>
              {errors.quirofano && <p className="text-xs text-red-600 mt-1">{errors.quirofano.message}</p>}
            </div>
            <div>
              <label className="label">Servicio *</label>
              <select className="input" {...register('servicio')}>
                <option value="">Seleccionar...</option>
                {SERVICIOS_CX.map(s => <option key={s} value={s}>{s}</option>)}
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
              <select className="input" {...register('procedimiento')}>
                <option value="">Seleccionar...</option>
                {PROCEDIMIENTOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Profesional Evaluador *</label>
              <select className="input" {...register('profesional')}>
                <option value="">Seleccionar...</option>
                {PROFESIONALES_CX.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {errors.profesional && <p className="text-xs text-red-600 mt-1">{errors.profesional.message}</p>}
            </div>
            <div>
              <label className="label">Identificación del Paciente</label>
              <input className="input" placeholder="Número de documento" {...register('identificacion_paciente')} />
            </div>
            <div>
              <label className="label">Nombre del Paciente</label>
              <input className="input" placeholder="Nombre completo del paciente" {...register('nombre_paciente')} />
            </div>
          </div>
        </div>

        {/* Condiciones del área */}
        <div className="card p-5">
          <SH>Condiciones del Área Quirúrgica</SH>
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
          <SH>Profilaxis Antibiótica</SH>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SC label="Antibiótico colocado antes de incisión"    name="coloca_antibiotico_antes"         register={register} error={errors.coloca_antibiotico_antes} />
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
              {errors.hora_finalizacion_cirugia && (
                <p className="text-xs text-red-600 mt-1">{errors.hora_finalizacion_cirugia.message}</p>
              )}
            </div>
            <SC label="Cumplimiento de profilaxis"                name="cumplimiento_profilaxis"          register={register} error={errors.cumplimiento_profilaxis} />
            <SC label="Refuerzo en cirugía prolongada"            name="refuerzo_antibiotico_prolongada"  register={register} error={errors.refuerzo_antibiotico_prolongada} />
          </div>
        </div>

        {/* Prácticas del equipo */}
        <div className="card p-5">
          <SH>Prácticas del Equipo Quirúrgico</SH>
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

        {/* Estado y adjuntos */}
        <div className="card p-5">
          <SH>Observaciones y Estado</SH>
          <div className="max-w-xs">
            <label className="label">Estado</label>
            <select className="input" {...register('estado')}>
              <option value="pendiente">Pendiente</option>
              <option value="en_proceso">En Proceso</option>
              <option value="validado">Validado</option>
              <option value="cerrado">Cerrado</option>
            </select>
          </div>
        </div>

        {/* Documentos adjuntos */}
        <div className="card p-5">
          <SH>Documentos Adjuntos</SH>
          <FileUpload value={adjuntos} onChange={setAdjuntos} folder="ronda-cirugia" />
        </div>

        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            ⚠️ Error al guardar: {saveError}
          </div>
        )}

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
