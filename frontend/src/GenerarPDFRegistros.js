import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const M = 12

const COLOR = {
  slate900: [15, 23, 42],
  slate700: [51, 65, 85],
  slate600: [71, 85, 105],
  slate400: [148, 163, 184],
  slate200: [226, 232, 240],
  slate100: [241, 245, 249],
  azul: [30, 64, 175]
}

const formatearFecha = (fecha) => {
  if (!fecha) return '-'
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)}`
}

const fmt = (n) => (Number(n) || 0).toLocaleString('es-PE', { maximumFractionDigits: 1 })

async function cargarLogo() {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      canvas.getContext('2d').drawImage(img, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => resolve(null)
    img.src = '/logo-packtech.png'
  })
}

function dibujarEncabezado(doc, logo, ancho, titulo, subtitulo) {
  const y = 12
  doc.setDrawColor(...COLOR.slate900)
  doc.setLineWidth(0.3)
  doc.line(M, y + 14, M + ancho, y + 14)

  if (logo) {
    doc.addImage(logo, 'PNG', M, y - 2, 58, 14.5)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...COLOR.azul)
    doc.text('PACKTECH', M, y + 6)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...COLOR.slate900)
  doc.text(titulo, M + ancho, y + 4, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...COLOR.slate600)
  doc.text(subtitulo, M + ancho, y + 10, { align: 'right', maxWidth: ancho - 60 })

  return y + 22
}

function dibujarResumen(doc, x, y, ancho, alto, total, etiquetaTotal, filtrosTexto) {
  doc.setFillColor(...COLOR.slate100)
  doc.roundedRect(x, y, ancho, alto, 1.5, 1.5, 'F')
  doc.setFillColor(...COLOR.azul)
  doc.rect(x, y, 1.5, alto, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLOR.slate900)
  doc.text(`${total} ${etiquetaTotal}`, x + 5, y + 7)

  if (filtrosTexto) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...COLOR.slate600)
    doc.text(`Filtros: ${filtrosTexto}`, x + 5, y + 13, { maxWidth: ancho - 10 })
  }
}

function piePagina(doc, ancho) {
  const paginas = doc.internal.getNumberOfPages()
  const generado = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.8)
    doc.setTextColor(...COLOR.slate400)
    doc.text(`Generado el ${generado} · PackTech`, M, 200)
    doc.text(`Página ${i} de ${paginas}`, M + ancho, 200, { align: 'right' })
  }
}

function textoFiltros(filtros) {
  const partes = []
  if (filtros.codigo) partes.push(`N° Pedido: "${filtros.codigo}"`)
  if (filtros.cliente) partes.push(`Cliente: "${filtros.cliente}"`)
  if (filtros.producto) partes.push(`Producto: "${filtros.producto}"`)
  if (filtros.estado) partes.push(`Estado: ${filtros.estado}`)
  if (filtros.proceso) partes.push(`Proceso: ${filtros.proceso}`)
  if (filtros.operario) partes.push(`Operario: ${filtros.operario}`)
  if (filtros.maquina) partes.push(`Máquina: ${filtros.maquina}`)
  return partes.length > 0 ? partes.join(' · ') : null
}

export async function generarPDFOrdenes(ordenes, config) {
  const { periodoLabel, desde, hasta, filtros } = config
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const ANCHO = 297 - M * 2
  const logo = await cargarLogo()

  const subtitulo = `${periodoLabel}${desde ? ` · ${formatearFecha(desde)} – ${formatearFecha(hasta)}` : ''}`
  let y = dibujarEncabezado(doc, logo, ANCHO, 'LISTADO DE ÓRDENES DE PRODUCCIÓN', subtitulo)

  const filtrosTxt = filtros ? textoFiltros(filtros) : null
  const altoResumen = filtrosTxt ? 16 : 10
  dibujarResumen(doc, M, y, ANCHO, altoResumen, ordenes.length, `orden${ordenes.length !== 1 ? 'es' : ''} de producción`, filtrosTxt)
  y += altoResumen + 6

  autoTable(doc, {
    startY: y,
    head: [['N° Pedido', 'Cliente', 'Producto', 'Cantidad', 'Estado', 'Último proceso', 'Fecha', 'Hora']],
    body: ordenes.map((o) => [
      o.codigo,
      o.cliente,
      o.descripcion || '-',
      `${fmt(o.cantidad)} ${o.unidad || ''}`,
      o.estado || '-',
      o.ultimo_proceso || '-',
      formatearFecha(o.fecha),
      o.hora?.slice(0, 5) || '-'
    ]),
    theme: 'grid',
    headStyles: { fillColor: COLOR.slate100, textColor: COLOR.slate900, fontStyle: 'bold', fontSize: 8, lineColor: COLOR.slate600, lineWidth: 0.15 },
    bodyStyles: { fontSize: 7.8, lineColor: COLOR.slate200 },
    margin: { left: M, right: M }
  })

  piePagina(doc, ANCHO)

  const sufijo = desde ? `${desde}_a_${hasta}` : 'Todo'
  doc.save(`Ordenes_${sufijo}.pdf`)
}

export async function generarPDFMovimientos(filas, config) {
  const { periodoLabel, desde, hasta, filtros } = config
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  const ANCHO = 297 - M * 2
  const logo = await cargarLogo()

  const subtitulo = `${periodoLabel}${desde ? ` · ${formatearFecha(desde)} – ${formatearFecha(hasta)}` : ''}`
  let y = dibujarEncabezado(doc, logo, ANCHO, 'LISTADO DE MOVIMIENTOS DE PRODUCCIÓN', subtitulo)

  const filtrosTxt = filtros ? textoFiltros(filtros) : null
  const altoResumen = filtrosTxt ? 16 : 10
  dibujarResumen(doc, M, y, ANCHO, altoResumen, filas.length, `movimiento${filas.length !== 1 ? 's' : ''}`, filtrosTxt)
  y += altoResumen + 6

  autoTable(doc, {
    startY: y,
    head: [['N° Pedido', 'Cliente', 'Proceso', 'Máquina', 'Operario', 'Entrada', 'Salida', 'Fecha', 'Hora']],
    body: filas.map((m) => [
      m.codigo,
      m.cliente,
      m.proceso,
      m.maquina,
      m.operario,
      fmt(m.entrada),
      fmt(m.salida),
      formatearFecha(m.fecha),
      m.hora?.slice(0, 5) || '-'
    ]),
    theme: 'grid',
    headStyles: { fillColor: COLOR.slate100, textColor: COLOR.slate900, fontStyle: 'bold', fontSize: 8, lineColor: COLOR.slate600, lineWidth: 0.15 },
    bodyStyles: { fontSize: 7.8, lineColor: COLOR.slate200 },
    margin: { left: M, right: M }
  })

  piePagina(doc, ANCHO)

  const sufijo = desde ? `${desde}_a_${hasta}` : 'Todo'
  doc.save(`Movimientos_${sufijo}.pdf`)
}