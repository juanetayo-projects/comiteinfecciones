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

// ── Servicios del hospital ─────────────────────────────────────
export const SERVICIOS = [
  'UCI Adultos','UCI Neonatal','UCI Pediátrica',
  'Urgencias Adultos','Urgencias Pediátrica',
  'Cirugía','Ortopedia','Ginecología','Obstetricia',
  'Medicina Interna','Pediatría','Cardiología',
  'Oncología','Neurología','Nefrología',
  'Hematología','Infectología','Neumología',
  'Gastroenterología','Endocrinología',
  'Sala de Partos','Neonatos','Hospitalización General',
]

export const QUIROFANOS = [
  'Quirófano 1','Quirófano 2','Quirófano 3',
  'Quirófano 4','Quirófano 5','Quirófano 6',
  'Sala de Partos',
]
