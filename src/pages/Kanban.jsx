import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import KanbanBoard from '../components/kanban/KanbanBoard'
import { Kanban as KanbanIcon } from 'lucide-react'

const toEstado = (s) => ['pendiente','en_proceso','validado','cerrado'].includes(s ?? '') ? s : 'pendiente'

export default function KanbanPage() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const [
      { data: aislamiento },
      { data: higiene },
      { data: luminometria },
      { data: ronda },
    ] = await Promise.all([
      supabase.from('encuesta_aislamiento').select('id,estado,servicio,nombre_evaluado,fecha_registro,created_at').order('created_at',{ascending:false}).limit(50),
      supabase.from('encuesta_higiene_manos').select('id,estado,servicio_evaluado,nombre_evaluado,fecha_evaluacion,created_at').order('created_at',{ascending:false}).limit(50),
      supabase.from('encuesta_luminometria').select('id,estado,servicio_evaluado,resultado,fecha_registro,created_at').order('created_at',{ascending:false}).limit(50),
      supabase.from('encuesta_ronda_cirugia').select('id,estado,quirofano,especialidad,fecha_registro,created_at').order('created_at',{ascending:false}).limit(50),
    ])

    setItems([
      ...(aislamiento  ?? []).map(r => ({ id: r.id, tipo: 'aislamiento',  titulo: `Aislamiento — ${r.servicio ?? ''}`,         subtitulo: r.nombre_evaluado ?? 'Sin nombre',  fecha: r.fecha_registro, estado: toEstado(r.estado), color: 'border-l-red-500'     })),
      ...(higiene      ?? []).map(r => ({ id: r.id, tipo: 'higiene',      titulo: `Higiene — ${r.servicio_evaluado ?? ''}`,     subtitulo: r.nombre_evaluado ?? 'Sin nombre',  fecha: r.fecha_evaluacion, estado: toEstado(r.estado), color: 'border-l-blue-500'   })),
      ...(luminometria ?? []).map(r => ({ id: r.id, tipo: 'luminometria', titulo: `Luminometría — ${r.servicio_evaluado ?? ''}`, subtitulo: r.resultado != null ? `${r.resultado} RLU` : 'Sin resultado', fecha: r.fecha_registro, estado: toEstado(r.estado), color: 'border-l-amber-500' })),
      ...(ronda        ?? []).map(r => ({ id: r.id, tipo: 'ronda',        titulo: `Cirugía — ${r.quirofano ?? 'N/A'}`,          subtitulo: r.especialidad ?? 'Sin especialidad', fecha: r.fecha_registro, estado: toEstado(r.estado), color: 'border-l-emerald-500' })),
    ])
    setLoading(false)
  }

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
          <KanbanIcon className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="page-title">Tablero Kanban</h1>
          <p className="page-subtitle">Gestión de estados de todas las encuestas</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <KanbanBoard initialItems={items} />
      )}
    </div>
  )
}
