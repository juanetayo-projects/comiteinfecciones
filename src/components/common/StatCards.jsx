// Fila de tarjetas KPI para las tablas de registros — resume el resultado o
// clasificación (Cumple / No Cumple / etc.) de los registros actualmente
// mostrados (respeta los filtros aplicados en la tabla).
export default function StatCards({ items }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
      {items.map((it, i) => (
        <div key={i} className={`card p-3.5 kpi-tile kpi-${it.color ?? 'slate'}`}>
          <p className="text-xl font-bold">{it.value}</p>
          <p className="text-xs font-medium mt-0.5">{it.label}</p>
        </div>
      ))}
    </div>
  )
}
