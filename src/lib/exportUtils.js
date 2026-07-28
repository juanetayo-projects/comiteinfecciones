// ExcelJS, jsPDF y html2canvas pesan ~1,5 MB juntos y sólo se usan al pulsar un
// botón de exportar: se cargan bajo demanda para no lastrar el arranque de la app.
const loadExcelJS     = () => import('exceljs').then(m => m.default ?? m)
const loadJsPDF       = async () => {
  const [{ default: jsPDF }, { default: autoTable }] =
    await Promise.all([import('jspdf'), import('jspdf-autotable')])
  return { jsPDF, autoTable }
}
const loadHtml2Canvas = () => import('html2canvas').then(m => m.default ?? m)

const BLUE     = [26, 79, 160]   // #1a4fa0 — color banner de la app
const BLUE_HEX = 'FF1A4FA0'      // el mismo azul en ARGB para Excel
const GRIS_HEX = 'FFEFF3FA'      // fondo del bloque de filtros
const ZEBRA    = 'FFF1F5F9'      // filas alternas de la tabla

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

/** Igual que loadLogoDataUrl pero devolviendo también su tamaño natural. */
async function loadLogo() {
  const dataUrl = await loadLogoDataUrl()
  if (!dataUrl) return null
  return new Promise(resolve => {
    const img = new Image()
    img.onload  = () => resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve(null)
    img.src = dataUrl
  })
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
/**
 * Exporta a .xlsx con encabezado institucional (logo sin deformar), título,
 * subtítulo y el detalle de los filtros aplicados.
 *
 * @param {Array}    data
 * @param {Array}    columns   [{ key, header|label, width }]
 * @param {string}   filename
 * @param {string}  [title]
 * @param {string}  [subtitle]
 * @param {string[]}[filtros]  resumen legible de los filtros aplicados
 */
export async function exportToExcel(data, columns, filename, title = '', subtitle = '', filtros = []) {
  const ExcelJS = await loadExcelJS()
  const wb = new ExcelJS.Workbook()
  wb.creator  = 'Comité de Infecciones — Clínica de Alta Complejidad Santa Bárbara'
  wb.created  = new Date()
  const ws = wb.addWorksheet('Datos', {
    views: [{ showGridLines: false }],
  })

  const nCols   = columns.length
  const lastCol = String.fromCharCode(64 + Math.min(nCols, 26))   // A..Z
  const span    = (r) => `A${r}:${lastCol}${r}`

  // ── Banda azul institucional con el logo ──────────────────────
  // El logo ocupa las filas 1-3; el texto va debajo para que nunca se solapen.
  for (let r = 1; r <= 5; r++) {
    ws.getRow(r).height = r <= 3 ? 15 : 18
    for (let c = 1; c <= nCols; c++) {
      ws.getCell(r, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_HEX } }
    }
  }

  const logo = await loadLogo()
  if (logo) {
    // Alto disponible: 3 filas × 15pt ≈ 60 px. El ancho se deriva de la
    // proporción real de la imagen para NO deformarla.
    const maxH  = 56
    const ratio = logo.width / logo.height
    const h     = maxH
    const w     = Math.round(h * ratio)
    const imgId = wb.addImage({ base64: logo.dataUrl, extension: 'png' })
    ws.addImage(imgId, {
      tl:  { col: 0.15, row: 0.2 },
      ext: { width: w, height: h },
      editAs: 'oneCell',
    })
  }

  ws.mergeCells(span(4))
  const cName = ws.getCell(`A4`)
  cName.value     = 'Clínica de Alta Complejidad Santa Bárbara'
  cName.font      = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } }
  cName.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

  ws.mergeCells(span(5))
  const cSub = ws.getCell(`A5`)
  cSub.value     = 'Comité de Infecciones'
  cSub.font      = { size: 10, color: { argb: 'FFD9E8FF' } }
  cSub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }

  // ── Título del reporte ────────────────────────────────────────
  let r = 7
  if (title) {
    ws.mergeCells(span(r))
    const c = ws.getCell(`A${r}`)
    c.value = title
    c.font  = { bold: true, size: 14, color: { argb: BLUE_HEX } }
    ws.getRow(r).height = 20
    r++
  }
  if (subtitle) {
    ws.mergeCells(span(r))
    const c = ws.getCell(`A${r}`)
    c.value = subtitle
    c.font  = { size: 10, color: { argb: 'FF64748B' } }
    r++
  }

  // ── Filtros aplicados ─────────────────────────────────────────
  ws.mergeCells(span(r))
  const cFil = ws.getCell(`A${r}`)
  cFil.value = filtros.length
    ? `Filtros aplicados:   ${filtros.join('   ·   ')}`
    : 'Filtros aplicados:   ninguno (todos los registros)'
  cFil.font      = { size: 10, color: { argb: 'FF1E293B' } }
  cFil.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRIS_HEX } }
  cFil.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true }
  cFil.border    = { left: { style: 'thick', color: { argb: BLUE_HEX } } }
  ws.getRow(r).height = filtros.length > 4 ? 28 : 18
  r++

  ws.mergeCells(span(r))
  const cGen = ws.getCell(`A${r}`)
  cGen.value = `Generado: ${new Date().toLocaleString('es-CO')}   ·   ${data.length} registro(s)`
  cGen.font  = { size: 9, italic: true, color: { argb: 'FF94A3B8' } }
  r += 2

  // ── Cabecera de la tabla ──────────────────────────────────────
  const headerRow = ws.getRow(r)
  columns.forEach((col, i) => {
    const c = headerRow.getCell(i + 1)
    c.value     = colLabel(col)
    c.font      = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    c.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE_HEX } }
    c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    c.border    = { bottom: { style: 'thin', color: { argb: BLUE_HEX } } }
  })
  headerRow.height = 22
  const headerRowNum = r
  r++

  // ── Datos ─────────────────────────────────────────────────────
  data.forEach((row, idx) => {
    const xlRow = ws.getRow(r + idx)
    columns.forEach((col, i) => {
      const val = row[col.key]
      const c   = xlRow.getCell(i + 1)
      c.value = val == null ? ''
              : typeof val === 'boolean' ? (val ? 'Sí' : 'No')
              : val
      c.font      = { size: 10 }
      c.alignment = { vertical: 'middle', wrapText: false }
      if (idx % 2 === 1) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }
      }
    })
  })

  // ── Formato final ─────────────────────────────────────────────
  columns.forEach((col, i) => { ws.getColumn(i + 1).width = col.width ?? 22 })

  // Congelar hasta la cabecera y activar autofiltro
  ws.views = [{
    state: 'frozen', xSplit: 0, ySplit: headerRowNum, showGridLines: false,
  }]
  if (data.length > 0) {
    ws.autoFilter = {
      from: { row: headerRowNum, column: 1 },
      to:   { row: headerRowNum + data.length, column: nCols },
    }
  }

  const buf  = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = `${filename}_${new Date().toISOString().slice(0,10)}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
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
  const { jsPDF, autoTable } = await loadJsPDF()
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
  const html2canvas = await loadHtml2Canvas()
  const canvas = await html2canvas(element, {
    scale:            2,            // nitidez para texto pequeño de las gráficas
    backgroundColor:  '#e9eef7',    // neu.base — mismo fondo que la pantalla
    useCORS:          true,
    logging:          false,
    windowWidth:      element.scrollWidth,
    onclone: (docClone) => {
      // El PDF es estático: se ocultan los controles que no aportan al informe
      docClone.querySelectorAll('[data-pdf-hide]').forEach(el => { el.style.display = 'none' })

      // html2canvas clona el DOM y eso REINICIA las animaciones CSS. La clase
      // .animate-fade-in arranca en opacity:0, así que la captura salía con un
      // velo gris (el contenido a media opacidad sobre el fondo). Se neutralizan
      // animaciones y transiciones y se fuerza la opacidad final.
      const style = docClone.createElement('style')
      style.textContent = `
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
        }
        .animate-fade-in { opacity: 1 !important; transform: none !important; }
      `
      docClone.head.appendChild(style)
    },
  })

  const { jsPDF } = await loadJsPDF()
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
