import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import FileUpload from '../../components/common/FileUpload'
import { ArrowLeft, Save } from 'lucide-react'
import { useLista } from '../../hooks/useLista'

// Servicios y objetos dependientes según archivo Excel listas
const SERVICIOS_OBJETOS = {
  'CIRUGIA': [
    'Arco en C',
    'Bomba de infusion',
    'Camilla',
    'Maquina de anestesia (perilla)',
    'Mesa de Mayo',
    'Ventilador (perilla)',
  ],
  'HOSPITALIZACION': [
    'Bomba de infusión',
    'Cama (panel de control)',
    'Colchón',
  ],
  'UCI': [
    'Bomba de infusión',
    'Cama (panel de control)',
    'Colchón',
    'Mindray signos vitales',
    'Ventilador',
  ],
  'URGENCIAS': [
    'Bomba de infusión',
    'Colchoneta',
    'Ventilador',
  ],
}

const SERVICIOS_LUM = Object.keys(SERVICIOS_OBJETOS)

function calcRango(rlu) {
  const n = Number(rlu)
  if (isNaN(n) || rlu === '' || rlu === undefined || rlu === null) return null
  return n < 100 ? 'CUMPLE' : 'NO CUMPLE'
}

const RANGO_STYLE = {
  'CUMPLE':    'bg-emerald-50 text-emerald-800 border-emerald-200',
  'NO CUMPLE': 'bg-red-50 text-red-800 border-red-200',
}
const RANGO_DESC = {
  'CUMPLE':    '< 100 RLU — Superficie limpia',
  'NO CUMPLE': '≥ 100 RLU — Requiere acción de limpieza',
}

const schema = z.object({
  fecha_registro:    z.string().min(1, 'Requerido'),
  servicio_evaluado: z.string().min(1, 'Requerido'),
  objeto:            z.string().min(1, 'Requerido'),
  resultado:         z.coerce.number({ required_error: 'Requerido' }).min(0, 'Debe ser ≥ 0'),
  estado:            z.string().default('pendiente'),
})

function SH({ children }) {
  return (
    <div className="px-3 py-2 bg-[#1a4fa0] border-l-4 border-white/40 rounded-r-md mb-4">
      <h3 className="text-sm font-semibold text-white tracking-wide">{children}</h3>
    </div>
  )
}

export default function LuminometriaForm() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const isEdit   = Boolean(id)
  const [saving,    setSaving]    = useState(false)
  const [adjuntos,  setAdjuntos]  = useState([])
  const [saveError, setSaveError] = useState('')

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fecha_registro: new Date().toISOString().slice(0, 10), estado: 'pendiente' },
  })

  const serviciosDB = useLista('servicio', SERVICIOS_LUM)
  const objetosDB   = useLista('objeto',   [])
  const servicio    = watch('servicio_evaluado')
  const rlu         = watch('resultado')
  const rango       = calcRango(rlu)
  // Use hardcoded service→object map if available; fall back to all DB objects
  const hardObj     = SERVICIOS_OBJETOS[servicio] ?? []
  const objetos     = servicio ? (hardObj.length > 0 ? hardObj : objetosDB) : []

  // Reset objeto when servicio changes
  useEffect(() => {
    if (!isEdit) setValue('objeto', '')
  }, [servicio])

  useEffect(() => {
    if (isEdit) {
      supabase.from('encuesta_luminometria').select('*').eq('id', id).single()
        .then(({ data }) => {
          if (data) { reset(data); setAdjuntos(data.adjuntos ?? []) }
        })
    }
  }, [id])

  async function onSubmit(values) {
    setSaving(true)
    setSaveError('')
    const payload = { ...values, rango: rango ?? '', adjuntos, registrado_por: user?.id }
    const { error } = isEdit
      ? await supabase.from('encuesta_luminometria').update(payload).eq('id', id)
      : await supabase.from('encuesta_luminometria').insert([payload])
    if (error) {
      setSaveError(error.message)
      setSaving(false)
      return
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Datos generales */}
        <div className="card p-5">
          <SH>Datos de la Medición</SH>
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
                {serviciosDB.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.servicio_evaluado && <p className="text-xs text-red-600 mt-1">{errors.servicio_evaluado.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="label">Objeto / Superficie evaluada *</label>
              {servicio ? (
                <select className="input" {...register('objeto')}>
                  <option value="">Seleccionar objeto...</option>
                  {objetos.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <div className="input bg-slate-50 text-slate-400 cursor-not-allowed">
                  Selecciona primero un servicio
                </div>
              )}
              {errors.objeto && <p className="text-xs text-red-600 mt-1">{errors.objeto.message}</p>}
            </div>
          </div>
        </div>

        {/* Resultado */}
        <div className="card p-5">
          <SH>Resultado y Clasificación</SH>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Resultado (RLU) *</label>
              <input type="number" min="0" step="0.01" className="input font-mono"
                placeholder="0" {...register('resultado')} />
              {errors.resultado && <p className="text-xs text-red-600 mt-1">{errors.resultado.message}</p>}
            </div>

            <div>
              <label className="label">Clasificación (automática)</label>
              {rango ? (
                <div className={`px-3 py-2 rounded-lg border text-sm font-semibold ${RANGO_STYLE[rango]}`}>
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
        </div>

        {/* Documentos adjuntos */}
        <div className="card p-5">
          <SH>Documentos Adjuntos</SH>
          <FileUpload value={adjuntos} onChange={setAdjuntos} folder="luminometria" />
        </div>

        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            ⚠️ Error al guardar: {saveError}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
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
