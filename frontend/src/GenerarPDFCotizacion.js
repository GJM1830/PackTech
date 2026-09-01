import jsPDF from 'jspdf'

const formatearFecha = (fecha) => {
  if (!fecha) return '-'
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)}`
}

const RUC_EMPRESA = '20554000755'
const ETIQUETA_UNIDAD_PRECIO = { millares: 'millares', unidades: 'unidades', rollos: 'rollos', kg: 'kg' }

export async function generarPDFCotizacion(pedido) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  const logoBase64 = await new Promise((resolve) => {
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

  const items = pedido.items || [{
    descripcion: pedido.descripcion, medidas: pedido.medidas, cantidad: pedido.cantidad,
    moneda: pedido.moneda, precio_unitario: pedido.precio_unitario, unidad_precio: pedido.unidad_precio,
    cantidad_precio: pedido.cantidad_precio, costo_total: pedido.costo_total
  }]
  const simbolo = items[0]?.moneda === 'Dólares' ? '$' : 'S/'
  const subtotal = items.reduce((s, it) => s + (it.costo_total || 0), 0)
  const igv = pedido.incluye_igv ? subtotal * 0.18 : 0
  const total = subtotal + igv
  const M = 12
  const ANCHO = 210 - M * 2

  const azul = [30, 64, 175]
  const slate900 = [15, 23, 42]
  const slate600 = [71, 85, 105]
  const slate400 = [148, 163, 184]
  const borde = [203, 213, 225]

  let y = 14

  // ---- Encabezado: logo a la izquierda, Pedido/Fecha alineados a la derecha ----
  doc.setDrawColor(...slate900)
  doc.setLineWidth(0.3)
  doc.line(M, y + 16, M + ANCHO, y + 16)

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', M, y - 2, 66, 16)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...azul)
    doc.text('PACKTECH', M, y + 6)
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...slate400)
  doc.text(`RUC: ${RUC_EMPRESA}`, M, y + 15)

  doc.setFontSize(8)
  doc.setTextColor(...slate600)
  doc.text('PEDIDO', M + 130, y + 4)
  doc.text('FECHA', M + 130, y + 11)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...slate900)
  doc.text(String(pedido.codigo_base || pedido.codigo), M + ANCHO, y + 4, { align: 'right' })
  doc.text(formatearFecha(pedido.fecha), M + ANCHO, y + 11, { align: 'right' })

  y += 20

  // ---- Bloque cliente / condición comercial ----
  const alturaBloque = 30
  doc.setDrawColor(...slate900)
  doc.setLineWidth(0.4)
  doc.rect(M, y, ANCHO, alturaBloque)
  doc.line(M + 130, y, M + 130, y + alturaBloque)

  const filaIzq = (label, valor, offsetY) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...slate600)
    doc.text(label, M + 3, y + offsetY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...slate900)
    doc.text(String(valor || '-'), M + 32, y + offsetY)
  }

  filaIzq('CLIENTE', pedido.cliente, 6)
  filaIzq('RUC / DNI', pedido.ruc, 12)
  filaIzq('DIRECCIÓN ENTREGA', pedido.direccion_entrega, 18)
  filaIzq('CONTACTO', pedido.numero_contacto, 24)

  const filaDer = (label, valor, offsetY) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...slate600)
    doc.text(label, M + 133, y + offsetY)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...slate900)
    doc.text(String(valor || '-'), M + 160, y + offsetY)
  }

  filaDer('VENDEDOR', pedido.vendedor, 6)
  filaDer('F. ENTREGA', formatearFecha(pedido.fecha_entrega), 12)
  filaDer('EMAIL', pedido.email_cliente, 18)

  y += alturaBloque

  // ---- Tabla de productos (azul claro, texto oscuro) ----
  const colX = [M, M + 18, M + 38, M + 118, M + 148, M + 190]
  const filaAltura = 8
  const filasMinimas = 4

  doc.setFillColor(219, 234, 254)
  doc.rect(M, y, ANCHO, filaAltura, 'F')
  doc.setTextColor(...slate900)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text('CANT.', colX[0] + 2, y + 5.5)
  doc.text('UNIDAD', colX[1] + 2, y + 5.5)
  doc.text('DESCRIPCIÓN', colX[2] + 2, y + 5.5)
  doc.text('P. UNITARIO', colX[3] + 2, y + 5.5)
  doc.text('TOTAL', colX[4] + 2, y + 5.5)

  y += filaAltura

  items.forEach((it) => {
    const cantidadTabla = it.unidad_precio && it.unidad_precio !== 'kg' ? it.cantidad_precio : it.cantidad
    const unidadTabla = it.unidad_precio ? (ETIQUETA_UNIDAD_PRECIO[it.unidad_precio] || 'kg') : 'kg'
    const simboloItem = it.moneda === 'Dólares' ? '$' : 'S/'

    doc.setDrawColor(...borde)
    doc.rect(M, y, ANCHO, filaAltura)
    colX.slice(1, -1).forEach((x) => doc.line(x, y, x, y + filaAltura))

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...slate900)
    doc.text(String(cantidadTabla || '-'), colX[0] + 2, y + 5.5)
    doc.text(unidadTabla, colX[1] + 2, y + 5.5)
    const descripcionPDF = it.medidas
      ? `${it.descripcion || '-'} (${it.medidas})`
      : (it.descripcion || '-')
    doc.text(descripcionPDF, colX[2] + 2, y + 5.5)
    doc.text(
      it.precio_unitario ? `${simboloItem} ${Number(it.precio_unitario).toFixed(2)}` : '-',
      colX[3] + 2, y + 5.5
    )
    doc.text(
      it.costo_total ? `${simboloItem} ${Number(it.costo_total).toFixed(2)}` : '-',
      colX[4] + 2, y + 5.5
    )

    y += filaAltura
  })

  const filasVacias = Math.max(0, filasMinimas - items.length)
  for (let i = 0; i < filasVacias; i++) {
    doc.setDrawColor(...borde)
    doc.rect(M, y, ANCHO, filaAltura)
    colX.slice(1, -1).forEach((x) => doc.line(x, y, x, y + filaAltura))
    y += filaAltura
  }

  y += 4

  // ---- Totales ----
  const anchoTotales = 55
  const xTotales = M + ANCHO - anchoTotales

  doc.setDrawColor(...borde)
  doc.rect(xTotales, y, anchoTotales, 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...slate600)
  doc.text('SUBTOTAL', xTotales + 2, y + 4.8)
  doc.setTextColor(...slate900)
  doc.text(`${simbolo} ${subtotal.toFixed(2)}`, xTotales + anchoTotales - 2, y + 4.8, { align: 'right' })
  y += 7

  if (pedido.incluye_igv) {
    doc.setDrawColor(...borde)
    doc.rect(xTotales, y, anchoTotales, 7)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...slate600)
    doc.text('IGV (18%)', xTotales + 2, y + 4.8)
    doc.setTextColor(...slate900)
    doc.text(`${simbolo} ${igv.toFixed(2)}`, xTotales + anchoTotales - 2, y + 4.8, { align: 'right' })
    y += 7
  }

  doc.setFillColor(30, 41, 59)
  doc.rect(xTotales, y, anchoTotales, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL', xTotales + 2, y + 6)
  doc.text(`${simbolo} ${total.toFixed(2)}`, xTotales + anchoTotales - 2, y + 6, { align: 'right' })

  y += 14

  // ---- Condiciones ----
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(...slate400)
  const condiciones = [
    'El comprador se declara estar legalmente autorizado para la marca que tiene en este pedido y exime al',
    'fabricante de toda responsabilidad sobre registro y marcas.',
    '',
    'Para asegurar la máxima vida útil del producto, manténgalo en el empaque original, considerando la',
    'manipulación y condición del almacenado del material.'
  ]
  condiciones.forEach((linea) => {
    doc.text(linea, M, y)
    y += 3.8
  })

  if (orden.incluye_igv != null || orden.observaciones_pedido) {
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...slate600)
    doc.text(orden.incluye_igv ? 'Precio incluye IGV' : 'Precio no incluye IGV', M, y)
    if (orden.observaciones_pedido) {
      y += 4
      doc.setFont('helvetica', 'normal')
      doc.text(`Obs: ${orden.observaciones_pedido}`, M, y, { maxWidth: ANCHO })
    }
  }

  if (orden.imagen_url) {
    y += 10
    const formato = orden.imagen_url.includes('image/png') ? 'PNG' : 'JPEG'
    try {
      doc.addImage(orden.imagen_url, formato, M, y, 60, 60)
      y += 64
    } catch {
      // si la imagen no es válida para el PDF, se omite sin romper la descarga
    }
  }

  y += 14
  doc.setDrawColor(...slate400)
  doc.line(M, y, M + 60, y)
  doc.setFontSize(7.5)
  doc.setTextColor(...slate600)
  doc.text('Firma / Huella', M, y + 4)

  doc.save(`Pedido_${pedido.codigo_base || pedido.codigo}.pdf`)
}