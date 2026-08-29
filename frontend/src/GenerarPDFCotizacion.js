import jsPDF from 'jspdf'

const formatearFecha = (fecha) => {
  if (!fecha) return '-'
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)}`
}

export async function generarPDFCotizacion(orden) {
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
  const simbolo = orden.moneda === 'Dólares' ? '$' : 'S/'
  const cantidadTabla = orden.unidad_precio === 'millares' ? orden.millares : orden.cantidad
  const unidadTabla = orden.unidad_precio === 'millares' ? 'millares' : orden.unidad
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

  doc.setFontSize(8)
  doc.setTextColor(...slate600)
  doc.text('PEDIDO', M + 130, y + 4)
  doc.text('FECHA', M + 130, y + 11)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...slate900)
  doc.text(String(orden.codigo), M + ANCHO, y + 4, { align: 'right' })
  doc.text(formatearFecha(orden.fecha), M + ANCHO, y + 11, { align: 'right' })

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

  filaIzq('CLIENTE', orden.cliente, 6)
  filaIzq('RUC / DNI', orden.ruc, 12)
  filaIzq('DIRECCIÓN ENTREGA', orden.direccion_entrega, 18)
  filaIzq('CONTACTO', orden.numero_contacto, 24)

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

  filaDer('MONEDA', orden.moneda, 6)
  filaDer('VENDEDOR', orden.vendedor, 12)
  filaDer('F. ENTREGA', formatearFecha(orden.fecha_entrega), 18)
  filaDer('EMAIL', orden.email_cliente, 24)

  y += alturaBloque

  // ---- Tabla de producto ----
  const colX = [M, M + 18, M + 38, M + 118, M + 148, M + 190]
  const filaAltura = 8

  doc.setFillColor(30, 41, 59)
  doc.rect(M, y, ANCHO, filaAltura, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.text('CANT.', colX[0] + 2, y + 5.5)
  doc.text('UNIDAD', colX[1] + 2, y + 5.5)
  doc.text('DESCRIPCIÓN', colX[2] + 2, y + 5.5)
  doc.text('P. UNITARIO', colX[3] + 2, y + 5.5)
  doc.text('TOTAL', colX[4] + 2, y + 5.5)

  y += filaAltura

  doc.setDrawColor(...borde)
  doc.rect(M, y, ANCHO, filaAltura)
  colX.slice(1, -1).forEach((x) => doc.line(x, y, x, y + filaAltura))

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...slate900)
  doc.text(String(cantidadTabla || '-'), colX[0] + 2, y + 5.5)
  doc.text(unidadTabla, colX[1] + 2, y + 5.5)
  const descripcionPDF = orden.medidas
    ? `${orden.descripcion || '-'} (${orden.medidas})`
    : (orden.descripcion || '-')
  doc.text(descripcionPDF, colX[2] + 2, y + 5.5)
  doc.text(
    orden.precio_unitario ? `${simbolo} ${Number(orden.precio_unitario).toFixed(2)}/${orden.unidad_precio}` : '-',
    colX[3] + 2, y + 5.5
  )
  doc.text(
    orden.costo_total ? `${simbolo} ${Number(orden.costo_total).toFixed(2)}` : '-',
    colX[4] + 2, y + 5.5
  )

  y += filaAltura

  for (let i = 0; i < 3; i++) {
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
  doc.text(
    orden.costo_total ? `${simbolo} ${Number(orden.costo_total).toFixed(2)}` : '-',
    xTotales + anchoTotales - 2, y + 4.8, { align: 'right' }
  )
  y += 7

  doc.setFillColor(30, 41, 59)
  doc.rect(xTotales, y, anchoTotales, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL', xTotales + 2, y + 6)
  doc.text(
    orden.costo_total ? `${simbolo} ${Number(orden.costo_total).toFixed(2)}` : '-',
    xTotales + anchoTotales - 2, y + 6, { align: 'right' }
  )

  if (orden.tipo_trabajo || orden.procesos_plan) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...slate600)
    doc.text(orden.tipo_trabajo ? `TIPO DE TRABAJO: ${orden.tipo_trabajo}` : 'RUTA DE PRODUCCIÓN', M, y + 6)
    
    y += 10
  } 

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

  y += 14
  doc.setDrawColor(...slate400)
  doc.line(M, y, M + 60, y)
  doc.setFontSize(7.5)
  doc.setTextColor(...slate600)
  doc.text('Firma / Huella', M, y + 4)

  doc.save(`Pedido_${orden.codigo}.pdf`)
}