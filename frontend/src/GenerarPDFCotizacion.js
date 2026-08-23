import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const formatearFecha = (fecha) => {
  if (!fecha) return '-'
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)}`
}

export function generarPDFCotizacion(orden) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const simbolo = orden.moneda === 'Dólares' ? '$' : 'S/'

  // Encabezado con marco
  doc.setDrawColor(30, 41, 59)
  doc.setLineWidth(0.5)
  doc.rect(10, 10, 190, 20)

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 64, 175)
  doc.text('PACKTECH', 15, 22)

  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.setFont('helvetica', 'normal')
  doc.text('Sistema de Gestión de Producción', 15, 27)

  doc.setDrawColor(30, 41, 59)
  doc.line(130, 10, 130, 30)

  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  doc.text('PEDIDO', 135, 15)
  doc.text('FECHA', 135, 22)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(String(orden.codigo), 165, 15)
  doc.text(formatearFecha(orden.fecha), 165, 22)

  // Datos del cliente
  let y = 38
  const filaDatos = (label, valor) => {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text(label, 12, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(15, 23, 42)
    doc.text(valor || '-', 55, y)
    y += 6
  }

  filaDatos('CLIENTE:', orden.cliente)
  filaDatos('RUC / DNI:', orden.ruc)
  filaDatos('DIRECCIÓN DE ENTREGA:', orden.direccion_entrega)
  filaDatos('N° DE CONTACTO:', orden.numero_contacto)
  filaDatos('EMAIL:', orden.email_cliente)
  filaDatos('FECHA DE ENTREGA:', formatearFecha(orden.fecha_entrega))

  // Datos comerciales, columna derecha
  let y2 = 38
  const filaDerecha = (label, valor) => {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(71, 85, 105)
    doc.text(label, 130, y2)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(15, 23, 42)
    doc.text(valor || '-', 165, y2)
    y2 += 6
  }

  filaDerecha('MONEDA:', orden.moneda)
  filaDerecha('VENDEDOR:', orden.vendedor)

  y = Math.max(y, y2) + 4

  // Tabla del producto
  autoTable(doc, {
    startY: y,
    head: [['CANT.', 'UNIDAD', 'DESCRIPCIÓN', 'PRECIO UNIT.', 'TOTAL']],
    body: [[
      String(orden.cantidad),
      orden.unidad,
      orden.descripcion || '-',
      orden.precio_unitario ? `${simbolo} ${Number(orden.precio_unitario).toFixed(2)} / ${orden.unidad_precio}` : '-',
      orden.costo_total ? `${simbolo} ${Number(orden.costo_total).toFixed(2)}` : '-'
    ]],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 10, right: 10 }
  })

  let yFinal = doc.lastAutoTable.finalY + 6

  if (orden.millares) {
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)
    doc.text(`Millares de referencia: ${orden.millares}`, 12, yFinal)
    yFinal += 8
  }

  // Total destacado
  doc.setFillColor(30, 41, 59)
  doc.rect(130, yFinal, 70, 12, 'F')
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL', 135, yFinal + 8)
  doc.text(
    orden.costo_total ? `${simbolo} ${Number(orden.costo_total).toFixed(2)}` : '-',
    195, yFinal + 8, { align: 'right' }
  )

  yFinal += 24

  // Condiciones
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  const condiciones = [
    'El comprador se declara estar legalmente autorizado para la marca que tiene en este pedido',
    'y exime al fabricante de toda responsabilidad sobre registro y marcas.',
    '',
    'Para asegurar la máxima vida útil del producto, manténgalo en el empaque original,',
    'considerando la manipulación y condición del almacenado del material.'
  ]
  condiciones.forEach((linea) => {
    doc.text(linea, 12, yFinal)
    yFinal += 4.5
  })

  yFinal += 15
  doc.setDrawColor(148, 163, 184)
  doc.line(12, yFinal, 80, yFinal)
  doc.text('Firma / Huella', 12, yFinal + 4)

  doc.save(`Cotizacion_${orden.codigo}.pdf`)
}