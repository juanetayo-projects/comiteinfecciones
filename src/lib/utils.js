import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = parseISO(dateStr)
    return isValid(d) ? format(d, 'dd/MM/yyyy', { locale: es }) : dateStr
  } catch {
    return dateStr
  }
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  try {
    const d = parseISO(dateStr)
    return isValid(d) ? format(d, 'dd/MM/yyyy HH:mm', { locale: es }) : dateStr
  } catch {
    return dateStr
  }
}

export function porcentaje(numerador, denominador) {
  if (!denominador || denominador === 0) return 0
  return Math.round((numerador / denominador) * 100)
}

// ── Estado badge ──────────────────────────────────────────────
export const ESTADO_LABEL = {
  pendiente:  'Pendiente',
  en_proceso: 'En Proceso',
  validado:   'Validado',
  cerrado:    'Cerrado',
}

export const ESTADO_COLOR = {
  pendiente:  'bg-yellow-100 text-yellow-800',
  en_proceso: 'bg-blue-100   text-blue-800',
  validado:   'bg-green-100  text-green-800',
  cerrado:    'bg-gray-100   text-gray-700',
}

export function estadoLabel(estado)      { return ESTADO_LABEL[estado] ?? estado ?? '—' }
export function estadoBadgeColor(estado) { return ESTADO_COLOR[estado] ?? 'bg-slate-100 text-slate-700' }

// ── Adherencia badge ──────────────────────────────────────────
export function cumpleLabel(val) {
  if (val === 'cumple')    return 'Cumple'
  if (val === 'no_cumple') return 'No Cumple'
  return '—'
}
export function cumpleBadge(val) {
  if (val === 'cumple')    return 'bg-emerald-100 text-emerald-800'
  if (val === 'no_cumple') return 'bg-red-100 text-red-800'
  return 'bg-slate-100 text-slate-600'
}

// ── Opciones de estado para los filtros de tabla ───────────────
export const ESTADO_OPTIONS = Object.entries(ESTADO_LABEL)
  .map(([value, label]) => ({ value, label }))

// Opciones CUMPLE / NO CUMPLE, reutilizadas por varios filtros
export const CUMPLE_OPTIONS = ['CUMPLE', 'NO CUMPLE']

/**
 * Convierte el estado de filtros de un dashboard en un resumen legible para el
 * encabezado del PDF. `labels` mapea cada clave a su etiqueta visible.
 *
 *   filtrosResumen({ desde:'2026-01-01', servicio:'UCI' },
 *                  { desde:'Desde', hasta:'Hasta', servicio:'Servicio' })
 *   → ['Desde: 2026-01-01', 'Servicio: UCI']
 */
export function filtrosResumen(filters, labels) {
  return Object.entries(filters)
    .filter(([, v]) => v !== '' && v != null)
    .map(([k, v]) => `${labels[k] ?? k}: ${v}`)
}
