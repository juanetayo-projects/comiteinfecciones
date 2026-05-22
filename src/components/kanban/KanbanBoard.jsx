import { useState, useCallback, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../lib/utils'
import { Clock, CheckCircle2, Circle, XCircle } from 'lucide-react'

const COLUMNS = [
  { id: 'pendiente',  label: 'Pendiente',  Icon: Circle,       bg: 'bg-yellow-50', border: 'border-yellow-200', header: 'bg-yellow-100 text-yellow-800' },
  { id: 'en_proceso', label: 'En Proceso', Icon: Clock,        bg: 'bg-blue-50',   border: 'border-blue-200',   header: 'bg-blue-100 text-blue-800'   },
  { id: 'validado',   label: 'Validado',   Icon: CheckCircle2, bg: 'bg-green-50',  border: 'border-green-200',  header: 'bg-green-100 text-green-800' },
  { id: 'cerrado',    label: 'Cerrado',    Icon: XCircle,      bg: 'bg-gray-50',   border: 'border-gray-200',   header: 'bg-gray-100 text-gray-700'   },
]

const TABLE_MAP = {
  aislamiento:  'encuesta_aislamiento',
  higiene:      'encuesta_higiene_manos',
  luminometria: 'encuesta_luminometria',
  ronda:        'encuesta_ronda_cirugia',
}

export default function KanbanBoard({ initialItems }) {
  const [items, setItems] = useState(initialItems)

  // Sincronizar cuando cambia el filtro externo
  useEffect(() => {
    setItems(initialItems)
  }, [initialItems])

  const onDragEnd = useCallback(async (result) => {
    if (!result.destination) return
    const { draggableId, destination } = result
    const newEstado = destination.droppableId

    setItems(prev => prev.map(item =>
      item.id === draggableId ? { ...item, estado: newEstado } : item
    ))

    const item = items.find(i => i.id === draggableId)
    if (!item) return
    const table = TABLE_MAP[item.tipo]
    if (table) await supabase.from(table).update({ estado: newEstado }).eq('id', draggableId)
  }, [items])

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const colItems = items.filter(i => i.estado === col.id)
          return (
            <div key={col.id} className="flex-shrink-0 w-72">
              {/* Cabecera */}
              <div className={`flex items-center justify-between px-3 py-2 rounded-t-xl ${col.header}`}>
                <div className="flex items-center gap-2">
                  <col.Icon className="w-3.5 h-3.5" />
                  <span className="text-xs font-bold uppercase tracking-wide">{col.label}</span>
                </div>
                <span className="text-xs font-bold bg-white/60 px-2 py-0.5 rounded-full">{colItems.length}</span>
              </div>

              {/* Drop zone */}
              <Droppable droppableId={col.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-64 p-2 space-y-2 rounded-b-xl border ${col.border} ${col.bg}
                      transition-colors ${snapshot.isDraggingOver ? 'brightness-95' : ''}`}
                  >
                    {colItems.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(drag, snap) => (
                          <div
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            {...drag.dragHandleProps}
                            className={`bg-white rounded-lg border border-l-4 ${item.color}
                              border-slate-200 p-3 shadow-sm cursor-grab active:cursor-grabbing
                              hover:shadow-md transition-shadow
                              ${snap.isDragging ? 'shadow-lg rotate-1 opacity-90' : ''}`}
                          >
                            <p className="text-sm font-semibold text-slate-800 leading-tight truncate">{item.titulo}</p>
                            <p className="text-xs text-slate-500 mt-1 truncate">{item.subtitulo}</p>
                            <p className="text-[10px] text-slate-400 mt-2">{formatDate(item.fecha)}</p>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {colItems.length === 0 && !snapshot.isDraggingOver && (
                      <div className="flex items-center justify-center h-24 text-xs text-slate-400">
                        Sin registros
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}
