import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import html2canvas from 'html2canvas'

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

/**
 * Dibuja el logo dentro de la caja (maxW × maxH) SIN deformarlo: escala por el
 * lado más restrictivo y centra verticalmente. El logo institucional es muy
 * apaisado (1909×538 ≈ 3.55:1), por eso forzarlo a un cuadrado lo aplastaba.
 *
 * @returns {number} la X donde termina el logo (para colocar el texto al lado),
 *                   o null si no se pudo dibujar.
 */
function drawLogoFitted(doc, dataUrl, x, y, maxW, maxH) {
  if (!dataUrl) return null
  try {
    const props = doc.getImageProperties(dataUrl)
    const ratio = props.width / props.height
    let w = maxW
    let h = w / ratio
    if (h > maxH) { h = maxH; w = h * ratio }
    const offsetY = y + (maxH - h) / 2          // centrado vertical en la banda
    doc.addImage(dataUrl, 'PNG', x, offsetY, w, h)
    return x + w
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

  // Logo institucional (respetando su proporción)
  const logoUrl = await loadLogoDataUrl()
  const logoEnd = drawLogoFitted(doc, logoUrl, 8, 5, 40, 18)
  const textX   = logoEnd != null ? logoEnd + 6 : 14

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Clínica de Alta Complejidad Santa Bárbara', textX, 12)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Comité de Infecciones', textX, 20)

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

// ── PDF DE DASHBOARD (captura la vista tal como se ve en pantalla) ──────────

/** Dibuja la banda azul institucional + título + filtros. Devuelve la Y libre. */
async function drawDashboardHeader(doc, pageW, title, subtitle, filtros) {
  doc.setFillColor(...BLUE)
  doc.rect(0, 0, pageW, 26, 'F')

  const logoUrl = await loadLogoDataUrl()
  const logoEnd = drawLogoFitted(doc, logoUrl, 8, 4, 40, 18)
  const textX   = logoEnd != null ? logoEnd + 6 : 14

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Clínica de Alta Complejidad Santa Bárbara', textX, 11)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Comité de Infecciones', textX, 18)

  doc.setFontSize(8)
  doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, pageW - 14, 18, { align: 'right' })

  // Título del dashboard
  let y = 35
  doc.setTextColor(...BLUE)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 14, y)

  if (subtitle) {
    y += 6
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(subtitle, 14, y)
  }

  // Bloque de filtros aplicados
  y += 7
  const lineas = (filtros && filtros.length)
    ? doc.splitTextToSize(`Filtros aplicados:  ${filtros.join('   ·   ')}`, pageW - 34)
    : ['Filtros aplicados:  ninguno (todos los registros)']

  const boxH = 6 + lineas.length * 4.4
  doc.setFillColor(239, 243, 250)
  doc.roundedRect(14, y - 4, pageW - 28, boxH, 2, 2, 'F')
  doc.setDrawColor(...BLUE)
  doc.setLineWidth(0.8)
  doc.line(14, y - 4, 14, y - 4 + boxH)     // barra lateral de marca
  doc.setLineWidth(0.2)

  doc.setFontSize(8.5)
  doc.setTextColor(30, 41, 59)
  lineas.forEach((l, i) => doc.text(l, 18, y + 1 + i * 4.4))

  return y - 4 + boxH + 6
}

/**
 * Exporta un dashboard a PDF conservando la apariencia y los colores de pantalla.
 *
 * @param {HTMLElement} element   contenedor del dashboard a capturar
 * @param {Object}   opts
 * @param {string}   opts.filename
 * @param {string}   opts.title
 * @param {string}  [opts.subtitle]
 * @param {string[]}[opts.filtros]  resumen legible de los filtros aplicados
 */
export async function exportDashboardToPDF(element, { filename, title, subtitle = '', filtros = [] }) {
  if (!element) throw new Error('No se encontró el contenido del dashboard para exportar')

  // html2canvas no interpreta bien `color-mix`/gradientes en algunos navegadores:
  // se fuerza un fondo sólido equivalente al de la app durante la captura.
  const canvas = await html2canvas(element, {
    scale:            2,            // nitidez para texto pequeño de las gráficas
    backgroundColor:  '#e9eef7',    // neu.base — mismo fondo que la pantalla
    useCORS:          true,
    logging:          false,
    windowWidth:      element.scrollWidth,
    onclone: (docClone) => {
      // El PDF es estático: se ocultan los controles que no aportan al informe
      docClone.querySelectorAll('[data-pdf-hide]').forEach(el => { el.style.display = 'none' })
    },
  })

  const doc   = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  const contentY = await drawDashboardHeader(doc, pageW, title, subtitle, filtros)

  const margin  = 10
  const imgW    = pageW - margin * 2
  const imgH    = (canvas.height * imgW) / canvas.width
  const availH  = pageH - contentY - 8          // alto útil en la primera página

  if (imgH <= availH) {
    doc.addImage(canvas, 'PNG', margin, contentY, imgW, imgH, undefined, 'FAST')
  } else {
    // El dashboard no cabe: se parte en varias páginas recortando el canvas
    const pxPerMm     = canvas.width / imgW
    let   sourceY     = 0
    let   destY       = contentY
    let   destAvail   = availH
    let   primera     = true

    while (sourceY < canvas.height) {
      const sliceH = Math.min(Math.floor(destAvail * pxPerMm), canvas.height - sourceY)

      const slice    = document.createElement('canvas')
      slice.width    = canvas.width
      slice.height   = sliceH
      const ctx      = slice.getContext('2d')
      ctx.fillStyle  = '#e9eef7'
      ctx.fillRect(0, 0, slice.width, slice.height)
      ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceH, 0, 0, canvas.width, sliceH)

      doc.addImage(slice, 'PNG', margin, destY, imgW, sliceH / pxPerMm, undefined, 'FAST')

      sourceY += sliceH
      if (sourceY < canvas.height) {
        doc.addPage()
        // Banda de encabezado compacta en las páginas siguientes
        doc.setFillColor(...BLUE)
        doc.rect(0, 0, pageW, 14, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text(`${title} (continuación)`, 14, 9)
        destY     = 20
        destAvail = pageH - destY - 8
        primera   = false
      }
    }
  }

  // Pie de página con numeración
  const pages = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text(`Página ${i} de ${pages}`, pageW - 14, pageH - 5, { align: 'right' })
    doc.text('Comité de Infecciones · Clínica de Alta Complejidad Santa Bárbara', 14, pageH - 5)
  }

  doc.save(`${filename}_${new Date().toISOString().slice(0,10)}.pdf`)
}
