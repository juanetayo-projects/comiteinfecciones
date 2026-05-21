import { useEffect, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import KanbanBoard from '../components/kanban/KanbanBoard'
import { Kanban as KanbanIcon, Filter, X } from 'lucide-react'

const toEstado = (s) => ['pendiente','en_proceso','validado','cerrado'].includes(s ?? '') ? s : 'pendiente'

const TIPO_FILTERS = [
  { value: '',             label: 'Todos',            cls: 'bg-indigo-600 text-white',  hov: 'hover:bg-indigo-50 hover:text-indigo-700'  },
  { value: 'aislamiento',  label: 'Aislamiento',      cls: 'bg-red-600 text-white',     hov: 'hover:bg-red-50 hover:text-red-700'        },
  { value: 'higiene',      label: 'Higiene de Manos', cls: 'bg-blue-600 text-white',    hov: 'hover:bg-blue-50 hover:text-blue-700'      },
  { value: 'luminometria', label: 'Luminometría',     cls: 'bg-amber-500 text-white',   hov: 'hover:bg-amber-50 hover:text-amber-700'    },
  { value: 'ronda',        label: 'Ronda Cirugía',    cls: 'bg-emerald-600 text-white', hov: 'hover:bg-emerald-50 hover:text-emerald-700'},
]

export default function KanbanPage() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('')

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
      ...(aislamiento  ?? []).map(r => ({ id: r.id, tipo: 'aislamiento',  titulo: `Aislamiento — ${r.servicio ?? ''}`,          subtitulo: r.nombre_evaluado ?? 'Sin nombre',            fecha: r.fecha_registro,  estado: toEstado(r.estado), color: 'border-l-red-500'     })),
      ...(higiene      ?? []).map(r => ({ id: r.id, tipo: 'higiene',      titulo: `Higiene — ${r.servicio_evaluado ?? ''}`,      subtitulo: r.nombre_evaluado ?? 'Sin nombre',            fecha: r.fecha_evaluacion, estado: toEstado(r.estado), color: 'border-l-blue-500'   })),
      ...(luminometria ?? []).map(r => ({ id: r.id, tipo: 'luminometria', titulo: `Luminometría — ${r.servicio_evaluado ?? ''}`, subtitulo: r.resultado != null ? `${r.resultado} RLU` : 'Sin resultado', fecha: r.fecha_registro, estado: toEstado(r.estado), color: 'border-l-amber-500' })),
      ...(ronda        ?? []).map(r => ({ id: r.id, tipo: 'ronda',        titulo: `Cirugía — ${r.quirofano ?? 'N/A'}`,           subtitulo: r.especialidad ?? 'Sin especialidad',         fecha: r.fecha_registro,  estado: toEstado(r.estado), color: 'border-l-emerald-500' })),
    ])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    if (!filtroTipo) return items
    return items.filter(i => i.tipo === filtroTipo)
  }, [items, filtroTipo])

  const counts = useMemo(() => {
    const all = {}
    TIPO_FILTERS.slice(1).forEach(f => {
      all[f.value] = items.filter(i => i.tipo === f.value).length
    })
    all[''] = items.length
    return all
  }, [items])

  return (
    <div className="p-6 lg:p-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
          <KanbanIcon className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="page-title">Tablero Kanban</h1>
          <p className="page-subtitle">Gestión de estados de todas las encuestas</p>
        </div>
      </div>

      {/* Filtros por tipo */}
      <div className="flex items-center gap-2 flex-wrap mb-6 card p-3">
        <Filter className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="text-xs text-slate-500 font-medium mr-1">Filtrar:</span>
        {TIPO_FILTERS.map(f => (
          <button key={f.value}
            onClick={() => setFiltroTipo(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors shadow-sm ${
              filtroTipo === f.value
                ? f.cls
                : `bg-slate-100 text-slate-600 ${f.hov}`
            }`}>
            {f.label}
            {counts[f.value] != null && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                filtroTipo === f.value ? 'bg-white/20' : 'bg-slate-200 text-slate-500'
              }`}>{counts[f.value]}</span>
            )}
          </button>
        ))}
        {filtroTipo && (
          <button onClick={() => setFiltroTipo('')}
            className="ml-auto flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition-colors">
            <X className="w-3 h-3" /> Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <KanbanBoard initialItems={filtered} />
      )}
    </div>
  )
}
