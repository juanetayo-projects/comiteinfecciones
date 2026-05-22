import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const BLUE = [26, 79, 160]   // #1a4fa0 — color banner de la app

// Resuelve el label de una columna (soporta { header } y { label })
function colLabel(c) { return c.header ?? c.label ?? '' }

// Carga el logo de la institución como dataURL (desde la carpeta public)
async function loadLogoDataUrl() {
  try {
    const base = import.meta.env.BASE_URL ?? '/'
    const res  = await fetch(`${base}logo_cacsb_blanc.png`)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// ── EXCEL ──────────────────────────────────────────────────────
export function exportToExcel(data, columns, filename) {
  const headers = columns.map(colLabel)
  const rows = data.map(row =>
    columns.map(col => {
      const val = row[col.key]
      if (val == null)               return ''
      if (typeof val === 'boolean')  return val ? 'Sí' : 'No'
      return val
    })
  )

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  // Anchos de columna
  ws['!cols'] = columns.map(c => ({ wch: c.width ?? 22 }))

  // Congelar primera fila
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0,10)}.xlsx`)
}

// ── PDF ────────────────────────────────────────────────────────
/**
 * @param {Array}  data
 * @param {Array}  columns    - [{ header, key }]
 * @param {string} filename
 * @param {string} title
 * @param {string} [subtitle]
 * @param {Array}  [kpis]     - [{ label, value, sub }] optional KPI cards row
 */
export async function exportToPDF(data, columns, filename, title, subtitle = '', kpis = null) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // ─ Banda de encabezado ─
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, 297, 28, 'F')

  // Logo institucional
  const logoUrl = await loadLogoDataUrl()
  if (logoUrl) {
    try { doc.addImage(logoUrl, 'PNG', 6, 4, 20, 20) } catch { /* fallo silencioso */ }
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Clínica de Alta Complejidad Santa Bárbara', 30, 12)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Comité de Infecciones', 30, 20)
  } else {
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('Clínica de Alta Complejidad Santa Bárbara', 14, 12)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Comité de Infecciones', 14, 20)
  }

  // ─ Título del reporte ─
  doc.setTextColor(...BLUE)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, 40)
  if (subtitle) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(subtitle, 14, 47)
  }
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 225, 40)

  // ─ Tarjetas KPI (opcionales) ─
  let tableStartY = subtitle ? 53 : 47
  if (kpis && kpis.length > 0) {
    const kpiY  = tableStartY + 2
    const total = kpis.length
    const pageW = 297
    const margin = 14
    const gap    = 2
    const boxW   = (pageW - margin * 2 - gap * (total - 1)) / total

    kpis.forEach((kpi, i) => {
      const x    = margin + i * (boxW + gap)
      const good = kpi.value >= 80
      // fondo de la tarjeta
      doc.setFillColor(...(good ? [236, 253, 245] : [254, 242, 242]))
      doc.roundedRect(x, kpiY, boxW, 22, 2, 2, 'F')
      // borde sutil
      doc.setDrawColor(...(good ? [167, 243, 208] : [254, 202, 202]))
      doc.roundedRect(x, kpiY, boxW, 22, 2, 2, 'S')
      // valor %
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(...(good ? [5, 150, 105] : [220, 38, 38]))
      doc.text(`${kpi.value}%`, x + boxW / 2, kpiY + 9, { align: 'center' })
      // label
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(71, 85, 105)
      doc.text(kpi.label, x + boxW / 2, kpiY + 14.5, { align: 'center' })
      // sub (n° registros)
      if (kpi.sub) {
        doc.setFontSize(6)
        doc.setTextColor(148, 163, 184)
        doc.text(kpi.sub, x + boxW / 2, kpiY + 19, { align: 'center' })
      }
    })
    tableStartY = kpiY + 26
  }

  // ─ Tabla ─
  const tableColumns = columns.map(c => ({ header: colLabel(c), dataKey: c.key }))
  const tableRows = data.map(row => {
    const r = {}
    columns.forEach(col => {
      const val = row[col.key]
      if (val == null)              r[col.key] = ''
      else if (typeof val === 'boolean') r[col.key] = val ? 'Sí' : 'No'
      else r[col.key] = val
    })
    return r
  })

  autoTable(doc, {
    columns: tableColumns,
    body:    tableRows,
    startY:  tableStartY,
    styles:        { fontSize: 8, cellPadding: 3 },
    headStyles:    { fillColor: BLUE, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    margin: { left: 14, right: 14 },
  })

  doc.save(`${filename}_${new Date().toISOString().slice(0,10)}.pdf`)
}
