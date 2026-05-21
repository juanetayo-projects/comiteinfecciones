import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import FileUpload from '../../components/common/FileUpload'
import { ArrowLeft, Save } from 'lucide-react'

const OPCIONES_MOMENTO = [
  { value: 'CUMPLE',      label: 'Cumple' },
  { value: 'NO CUMPLE',   label: 'No Cumple' },
  { value: 'NO EVALUADO', label: 'No Evaluado' },
  { value: 'NO REALIZA',  label: 'No Realiza' },
]

// Ordenados alfabéticamente
const PERFILES = [
  'AUXILIAR', 'ENFERMERA (O)', 'FISIOTERAPEUTA', 'INTERNO',
  'MEDICO', 'MEDICO ESPECIALISTA', 'NUTRICIONISTA', 'TERAPEUTA RESPIRATORIO',
]

const PORTA_ACCESORIOS_OPC = [
  { value: 'CADENA',              label: 'Cadena' },
  { value: 'NO PORTA ACCESORIOS', label: 'No Porta Accesorios' },
  { value: 'PULSERAS',            label: 'Pulseras' },
  { value: 'RELOJ',               label: 'Reloj' },
]

const MOMENTOS = [
  { name: 'momento_1', label: 'Momento 1 — Antes de tocar al paciente' },
  { name: 'momento_2', label: 'Momento 2 — Antes de procedimiento aséptico' },
  { name: 'momento_3', label: 'Momento 3 — Tras riesgo de exposición a fluidos' },
  { name: 'momento_4', label: 'Momento 4 — Después de tocar al paciente' },
  { name: 'momento_5', label: 'Momento 5 — Después del entorno del paciente' },
]

// Servicios ordenados alfabéticamente
const SERVICIOS_HM = [
  'CIRUGIA', 'CONSULTA EXTERNA', 'HEMODINAMIA',
  'HOSPITALIZACIÓN', 'HOSPITALIZACIÓN 2', 'IMAGENOLOGIA',
  'LABORATORIO', 'NEONATOS', 'PEDIATRIA', 'UCI', 'URGENCIAS',
]

const schema = z.object({
  fecha_evaluacion:        z.string().min(1, 'Requerido'),
  servicio_evaluado:       z.string().min(1, 'Requerido'),
  nombre_evaluado:         z.string().min(2, 'Requerido'),
  perfil_colaborador:      z.string().min(1, 'Requerido'),
  nombre_quien_diligencia: z.string().optional(),
  momento_1:               z.string().default(''),
  momento_2:               z.string().default(''),
  momento_3:               z.string().default(''),
  momento_4:               z.string().default(''),
  momento_5:               z.string().default(''),
  unas_cortas_esmalte:     z.boolean().default(false),
  porta_accesorios:        z.string().default(''),
  retroalimenta_trabajador: z.boolean().default(false),
  observaciones:           z.string().optional(),
  soporte_no_cumplimiento: z.string().optional(),
  estado:                  z.string().default('pendiente'),
})

function calcSumatoria(values) {
  return ['momento_1','momento_2','momento_3','momento_4','momento_5']
    .filter(c => values[c] === 'CUMPLE').length
}

function SH({ children }) {
  return (
    <div className="px-3 py-2 bg-amber-50 border-l-4 border-amber-400 rounded-r-md mb-4">
      <h3 className="text-sm font-semibold text-amber-900">{children}</h3>
    </div>
  )
}

export default function HigieneManosForn() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const isEdit    = Boolean(id)
  const [saving,    setSaving]    = useState(false)
  const [adjuntos,  setAdjuntos]  = useState([])
  const [saveError, setSaveError] = useState('')

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      fecha_evaluacion: new Date().toISOString().slice(0, 10),
      estado: 'pendiente',
      momento_1: '', momento_2: '', momento_3: '', momento_4: '', momento_5: '',
      porta_accesorios: '',
    },
  })

  const values    = watch()
  const sumatoria = calcSumatoria(values)
  // Columna L: CUMPLE solo si sumatoria === 5
  const resultado = sumatoria === 0 ? '' : sumatoria === 5 ? 'CUMPLE' : 'NO CUMPLE'

  useEffect(() => {
    if (isEdit) {
      supabase.from('encuesta_higiene_manos').select('*').eq('id', id).single()
        .then(({ data }) => {
          if (data) { reset(data); setAdjuntos(data.adjuntos ?? []) }
        })
    }
  }, [id])

  async function onSubmit(vals) {
    setSaving(true)
    setSaveError('')
    const payload = {
      ...vals,
      fecha_registro: new Date().toISOString(),
      sumatoria_cumplimiento: sumatoria,
      resultado_cumplimiento: resultado,
      adjuntos,
      registrado_por: user?.id,
    }
    const { error } = isEdit
      ? await supabase.from('encuesta_higiene_manos').update(payload).eq('id', id)
      : await supabase.from('encuesta_higiene_manos').insert([payload])
    if (error) {
      setSaveError(error.message)
      setSaving(false)
      return
    }
    navigate('/encuestas/higiene-manos')
  }

  return (
    <div className="p-6 lg:p-8 animate-fade-in max-w-3xl">
      <div className="mb-6">
        <Link to="/encuestas/higiene-manos"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a registros
        </Link>
        <h1 className="page-title">{isEdit ? 'Editar' : 'Nueva'} Observación — Higiene de Manos</h1>
        <p className="page-subtitle">Verificación de los 5 momentos OMS para la higiene de manos</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Datos generales */}
        <div className="card p-5">
          <SH>Datos Generales</SH>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha de Evaluación *</label>
              <input type="date" className="input" {...register('fecha_evaluacion')} />
              {errors.fecha_evaluacion && <p className="text-xs text-red-600 mt-1">{errors.fecha_evaluacion.message}</p>}
            </div>
            <div>
              <label className="label">Servicio *</label>
              <select className="input" {...register('servicio_evaluado')}>
                <option value="">Seleccionar...</option>
                {SERVICIOS_HM.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.servicio_evaluado && <p className="text-xs text-red-600 mt-1">{errors.servicio_evaluado.message}</p>}
            </div>
            <div>
              <label className="label">Nombre del Evaluado *</label>
              <input className="input" placeholder="Nombre del colaborador observado"
                {...register('nombre_evaluado')} />
              {errors.nombre_evaluado && <p className="text-xs text-red-600 mt-1">{errors.nombre_evaluado.message}</p>}
            </div>
            <div>
              <label className="label">Perfil del Colaborador *</label>
              <select className="input" {...register('perfil_colaborador')}>
                <option value="">Seleccionar...</option>
                {PERFILES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {errors.perfil_colaborador && <p className="text-xs text-red-600 mt-1">{errors.perfil_colaborador.message}</p>}
            </div>
            <div>
              <label className="label">Quien Diligencia</label>
              <input className="input" placeholder="Nombre del evaluador"
                {...register('nombre_quien_diligencia')} />
            </div>
          </div>
        </div>

        {/* 5 Momentos */}
        <div className="card p-5">
          <SH>5 Momentos OMS</SH>
          <div className="space-y-3">
            {MOMENTOS.map(m => (
              <div key={m.name} className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2">
                <label className="text-sm text-slate-700 sm:col-span-2">{m.label}</label>
                <select className="input" {...register(m.name)}>
                  <option value="">—</option>
                  {OPCIONES_MOMENTO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Columnas K y L calculadas */}
          <div className="mt-4 flex items-center gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-0.5">Sumatoria (K)</p>
              <p className="text-2xl font-bold text-slate-800">{sumatoria}<span className="text-sm font-normal text-slate-400">/5</span></p>
            </div>
            <div className="w-px h-10 bg-slate-200" />
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-0.5">Resultado (L)</p>
              {resultado
                ? <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold
                    ${resultado === 'CUMPLE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {resultado}
                  </span>
                : <span className="text-sm text-slate-400">—</span>
              }
            </div>
            <p className="text-xs text-slate-400 ml-auto">CUMPLE = todos los 5 momentos</p>
          </div>
        </div>

        {/* Criterios adicionales */}
        <div className="card p-5">
          <SH>Criterios Adicionales</SH>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Porta Accesorios</label>
              <select className="input" {...register('porta_accesorios')}>
                <option value="">Seleccionar...</option>
                {PORTA_ACCESORIOS_OPC.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2.5 mt-5">
              <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600"
                {...register('unas_cortas_esmalte')} />
              <label className="text-sm text-slate-700 cursor-pointer">
                Uñas cortas y esmalte integro
              </label>
            </div>
          </div>
          <div className="mt-4">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600"
                {...register('retroalimenta_trabajador')} />
              <span className="text-sm text-slate-700">Se retroalimentó al trabajador sobre los hallazgos</span>
            </label>
          </div>
        </div>

        {/* Observaciones y estado */}
        <div className="card p-5">
          <SH>Observaciones y Estado</SH>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Observaciones</label>
              <textarea rows={3} className="input resize-none"
                placeholder="Notas adicionales..." {...register('observaciones')} />
            </div>
            <div>
              <label className="label">Soporte de No Cumplimiento</label>
              <input className="input" placeholder="Nro. acta, correo, etc."
                {...register('soporte_no_cumplimiento')} />
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
          <FileUpload value={adjuntos} onChange={setAdjuntos} folder="higiene-manos" />
        </div>

        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            ⚠️ Error al guardar: {saveError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link to="/encuestas/higiene-manos" className="btn-secondary">Cancelar</Link>
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
