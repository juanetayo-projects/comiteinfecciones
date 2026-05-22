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
    const res  = await fetch(`${base}logo_cacsb2.png`)
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
export async function exportToPDF(data, columns, filename, title, subtitle = '') {
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
    startY:  subtitle ? 53 : 47,
    styles:        { fontSize: 8, cellPadding: 3 },
    headStyles:    { fillColor: BLUE, textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    margin: { left: 14, right: 14 },
  })

  doc.save(`${filename}_${new Date().toISOString().slice(0,10)}.pdf`)
}
