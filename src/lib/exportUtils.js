import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ── EXCEL ──────────────────────────────────────────────────────
export function exportToExcel(data, columns, filename) {
  const headers = columns.map(c => c.label)
  const rows = data.map(row =>
    columns.map(col => {
      const val = row[col.key]
      if (val == null)          return ''
      if (typeof val === 'boolean') return val ? 'Sí' : 'No'
      return val
    })
  )

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])

  // Anchos de columna
  ws['!cols'] = columns.map(c => ({ wch: c.width ?? 18 }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Datos')
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0,10)}.xlsx`)
}

// ── PDF ────────────────────────────────────────────────────────
export function exportToPDF(data, columns, filename, title, subtitle = '') {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  // Encabezado institucional
  doc.setFillColor(30, 64, 175)
  doc.rect(0, 0, 297, 26, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('Clínica de Alta Complejidad Santa Bárbara', 14, 10)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Comité de Infecciones', 14, 18)

  // Título del reporte
  doc.setTextColor(30, 64, 175)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, 36)
  if (subtitle) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(subtitle, 14, 43)
  }
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 240, 36)

  // Tabla
  const tableColumns = columns.map(c => ({ header: c.label, dataKey: c.key }))
  const tableRows = data.map(row => {
    const r = {}
    columns.forEach(col => {
      const val = row[col.key]
      if (val == null)          r[col.key] = ''
      else if (typeof val === 'boolean') r[col.key] = val ? 'Sí' : 'No'
      else r[col.key] = val
    })
    return r
  })

  autoTable(doc, {
    columns: tableColumns,
    body: tableRows,
    startY: subtitle ? 50 : 44,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [241, 245, 249] },
    margin: { left: 14, right: 14 },
  })

  doc.save(`${filename}_${new Date().toISOString().slice(0,10)}.pdf`)
}
