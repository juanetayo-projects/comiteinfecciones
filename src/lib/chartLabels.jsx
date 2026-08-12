/**
 * Etiquetas de porcentaje reutilizables para las gráficas de Recharts.
 *
 * Se extrajeron de AislamentoDashboard para aplicar el mismo criterio en todos
 * los dashboards: % dentro de cada segmento apilado y % de adherencia sobre la
 * barra (verde ≥80 %, rojo <80 %).
 */

import { useState } from 'react'

/**
 * Habilita mostrar/ocultar series en un gráfico (barra o línea) haciendo clic
 * sobre su ítem en la leyenda. Uso:
 *
 *   const tgl = useSeriesToggle()
 *   <Legend onClick={tgl.onLegendClick} formatter={tgl.legendFormatter} />
 *   <Line dataKey="criterio_1" hide={tgl.hidden.has('criterio_1')} ... />
 */
export function useSeriesToggle() {
  const [hidden, setHidden] = useState(() => new Set())

  function toggle(dataKey) {
    setHidden(prev => {
      const next = new Set(prev)
      next.has(dataKey) ? next.delete(dataKey) : next.add(dataKey)
      return next
    })
  }

  function onLegendClick(entry) {
    if (entry?.dataKey != null) toggle(entry.dataKey)
  }

  function legendFormatter(value, entry) {
    const isHidden = hidden.has(entry?.dataKey)
    return (
      <span style={{ opacity: isHidden ? 0.4 : 1, textDecoration: isHidden ? 'line-through' : 'none' }}>
        {value}
      </span>
    )
  }

  return { hidden, toggle, onLegendClick, legendFormatter }
}

export const BAR_CUMPLE    = '#059669'   // emerald-600
export const BAR_NO_CUMPLE = '#e11d48'   // rose-600
export const PIE_COLORS    = [BAR_CUMPLE, BAR_NO_CUMPLE]

/**
 * Agrupa filas por `key` y devuelve datos listos para un BarChart apilado
 * CUMPLE / NO CUMPLE con los porcentajes ya calculados.
 *
 * @param {Array}  rows
 * @param {string} key       campo por el que agrupar
 * @param {string} fallback  etiqueta cuando el campo viene vacío
 * @param {(row:any)=>boolean} isCumple  cómo decidir si la fila cumple
 */
export function buildBarData(rows, key, fallback, isCumple = r => r.adherencia === 'CUMPLE') {
  return Object.values(
    rows.reduce((acc, r) => {
      const k = r[key] || fallback
      if (!acc[k]) acc[k] = { name: k, CUMPLE: 0, 'NO CUMPLE': 0 }
      isCumple(r) ? acc[k].CUMPLE++ : acc[k]['NO CUMPLE']++
      return acc
    }, {})
  ).map(d => {
    const total = d.CUMPLE + d['NO CUMPLE']
    return {
      ...d,
      total,
      pctCumple:   total > 0 ? Math.round((d.CUMPLE / total) * 100) : 0,
      pctNoCumple: total > 0 ? Math.round((d['NO CUMPLE'] / total) * 100) : 0,
    }
  }).sort((a, b) => b.total - a.total)
}

/** % dentro de cada segmento de la barra apilada (se omite si no cabe) */
export function SegmentLabel({ x, y, width, height, value }) {
  if (!value || height < 16) return null
  return (
    <text
      x={x + width / 2}
      y={y + height / 2}
      fill="#ffffff"
      fontSize={11}
      fontWeight={700}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {value}%
    </text>
  )
}

/** % de adherencia encima de la barra apilada */
export function TotalPctLabel({ x, y, width, value }) {
  if (value == null) return null
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      fill={value >= 80 ? '#047857' : '#be123c'}
      fontSize={11}
      fontWeight={800}
      textAnchor="middle"
    >
      {value}%
    </text>
  )
}

/** Tooltip con conteo y % por segmento */
export function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-xl bg-white/95 shadow-neu px-3 py-2 text-xs border border-white">
      <p className="font-bold text-brand-900 mb-1">{label}</p>
      <p className="text-emerald-700 font-semibold">CUMPLE: {d.CUMPLE} ({d.pctCumple}%)</p>
      <p className="text-rose-700 font-semibold">NO CUMPLE: {d['NO CUMPLE']} ({d.pctNoCumple}%)</p>
      <p className="text-slate-500 mt-1">Total: {d.total} · Adherencia {d.pctCumple}%</p>
    </div>
  )
}

/**
 * Etiqueta sobre una barra simple (no apilada). Se usa con un dataKey que ya
 * trae el texto listo, p. ej. `etiqueta: '12 (34%)'`.
 */
export function TopLabel({ x, y, width, value }) {
  if (value == null || value === '') return null
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      fill="#1a4fa0"
      fontSize={11}
      fontWeight={700}
      textAnchor="middle"
    >
      {value}
    </text>
  )
}

/**
 * Añade `pctCumple` / `pctNoCumple` / `total` a series de criterios que ya
 * traen los conteos en `cumple` y `noCumple`.
 */
export function withCriterioPct(rows) {
  return rows.map(r => {
    const total = (r.cumple ?? 0) + (r.noCumple ?? 0)
    return {
      ...r,
      total,
      pctCumple:   total > 0 ? Math.round((r.cumple   / total) * 100) : 0,
      pctNoCumple: total > 0 ? Math.round((r.noCumple / total) * 100) : 0,
    }
  })
}

/** Añade `pct` y `etiqueta` ("N (P%)") a una serie simple sobre un total dado */
export function withPct(rows, valueKey, total) {
  return rows.map(r => {
    const pct = total > 0 ? Math.round((r[valueKey] / total) * 100) : 0
    return { ...r, pct, etiqueta: `${r[valueKey]} (${pct}%)` }
  })
}

/** Leyenda de ayuda que se muestra bajo el título de cada gráfica */
export const PCT_HINT = '% dentro de cada barra · % de adherencia arriba'
