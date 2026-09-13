import jsPDF from 'jspdf'

const formatearFecha = (fecha) => {
  if (!fecha) return '-'
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)}`
}

const RUC_EMPRESA = '20554000755'

export async function generarPDFCotizacionDoc(cotizacion) {
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

  const items = cotizacion.items || []
  const simbolo = cotizacion.moneda === 'Dólares' ? '$' : 'S/'
  const M = 12
  const ANCHO = 210 - M * 2

  const azul = [30, 64, 175]
  const slate900 = [15, 23, 42]
  const slate600 = [71, 85, 105]
  const slate400 = [148, 163, 184]
  const borde = [0, 0, 0]

  let y = 14

  // ---- Encabezado ----
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...slate900)
  doc.text('COTIZACIÓN', M, y + 4)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...slate600)
  doc.text('N°', M + 140, y)
  doc.text('RUC', M + 140, y + 6)
  doc.text('FECHA', M + 140, y + 12)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...slate900)
  doc.text(String(cotizacion.codigo), M + ANCHO, y, { align: 'right' })
  doc.text(RUC_EMPRESA, M + ANCHO, y + 6, { align: 'right' })
  doc.text(formatearFecha(cotizacion.fecha), M + ANCHO, y + 12, { align: 'right' })

  y += 20

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', M, y, 50, 12)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...azul)
    doc.text('PACKTECH', M, y + 8)
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...slate900)
  doc.text('Sr(as):', M, y + 20)
  doc.text('Estimada(os):', M, y + 25)
  doc.setFont('helvetica', 'bold')
  doc.text(String(cotizacion.cliente || '-'), M + 28, y + 22.5)

  y += 32

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...slate600)
  const intro = 'Es grato dirigirnos a ustedes para proponer a su consideración la siguiente cotización:'
  doc.text(intro, M, y)
  y += 6

  // ---- Tabla ----
  const colX = [M, M + 65, M + 90, M + 115, M + 150, M + 190]
  const anchoDescripcion = colX[1] - colX[0] - 4
  const filaAlturaMin = 8
  const alturaLineaTexto = 3.6

  doc.setFillColor(219, 234, 254)
  doc.rect(M, y, ANCHO, filaAlturaMin, 'F')
  doc.setDrawColor(...borde)
  doc.rect(M, y, ANCHO, filaAlturaMin)
  colX.slice(1, -1).forEach((x) => doc.line(x, y, x, y + filaAlturaMin))
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...slate900)
  doc.text('DESCRIPCIÓN', colX[0] + 2, y + 5.5)
  doc.text('MEDIDAS', colX[1] + 2, y + 5.5)
  doc.text('CANT.', colX[2] + 2, y + 5.5)
  doc.text('UNIDAD', colX[3] + 2, y + 5.5)
  doc.text('P. UNIT.', colX[4] + 2, y + 5.5)
  doc.text('SUBTOTAL', colX[5] + 2, y + 5.5)

  y += filaAlturaMin

  let subtotal = 0

  items.forEach((it) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)

    const descripcionBase = it.descripcion || '-'
    const rutaTexto = it.procesos_plan ? it.procesos_plan.split(',').join(' → ') : null
    const lineasDescripcion = doc.splitTextToSize(String(descripcionBase), anchoDescripcion)
    if (rutaTexto) {
      const lineasRuta = doc.splitTextToSize(`Ruta: ${rutaTexto}`, anchoDescripcion)
      lineasDescripcion.push(...lineasRuta)
    }

    const lineasMedidas = doc.splitTextToSize(String(it.medidas || '-'), colX[2] - colX[1] - 4)

    const filaAltura = Math.max(
      filaAlturaMin,
      Math.max(lineasDescripcion.length, lineasMedidas.length) * alturaLineaTexto + 4.5
    )

    if (y + filaAltura > 270) {
      doc.addPage()
      y = 16
    }

    doc.setDrawColor(...borde)
    doc.rect(M, y, ANCHO, filaAltura)
    colX.slice(1, -1).forEach((x) => doc.line(x, y, x, y + filaAltura))

    doc.setTextColor(...slate900)
    doc.text(lineasDescripcion, colX[0] + 2, y + 5.5)
    doc.text(lineasMedidas, colX[1] + 2, y + 5.5)
    doc.text(String(it.cantidad ?? '-'), colX[2] + 2, y + 5.5)
    doc.text(String(it.unidad || '-'), colX[3] + 2, y + 5.5)
    doc.text(
      it.precio_unitario ? `${simbolo} ${Number(it.precio_unitario).toFixed(2)}` : '-',
      colX[4] + 2, y + 5.5,
      { maxWidth: colX[5] - colX[4] - 4 }
    )
    doc.text(
      it.costo_total ? `${simbolo} ${Number(it.costo_total).toFixed(2)}` : '-',
      colX[5] + 2, y + 5.5,
      { maxWidth: (M + ANCHO) - colX[5] - 4 }
    )

    subtotal += it.costo_total || 0
    y += filaAltura
  })

  y += 4

  // ---- Totales ----
  const anchoTotales = 60
  const xTotales = M + ANCHO - anchoTotales
  const igv = cotizacion.incluye_igv ? subtotal * 0.18 : 0
  const total = subtotal + igv

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...slate600)
  doc.text('SUBTOTAL', xTotales + 2, y + 5)
  doc.setTextColor(...slate900)
  doc.text(`${simbolo} ${subtotal.toFixed(2)}`, xTotales + anchoTotales - 2, y + 5, { align: 'right' })
  y += 7

  if (cotizacion.incluye_igv) {
    doc.setTextColor(...slate600)
    doc.text('IGV (18%)', xTotales + 2, y + 5)
    doc.setTextColor(...slate900)
    doc.text(`${simbolo} ${igv.toFixed(2)}`, xTotales + anchoTotales - 2, y + 5, { align: 'right' })
    y += 7
  }

  doc.setFillColor(30, 64, 175)
  doc.rect(xTotales, y, anchoTotales, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL', xTotales + 2, y + 6)
  doc.text(`${simbolo} ${total.toFixed(2)}`, xTotales + anchoTotales - 2, y + 6, { align: 'right' })
  doc.setDrawColor(...borde)
  doc.rect(xTotales, y, anchoTotales, 9)

  y += 16

  // ---- Condiciones comerciales ----
  const condicion = (label, valor) => {
    if (!valor) return
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...slate600)
    doc.text(label, M, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...slate900)
    doc.text(String(valor), M + 42, y)
    y += 5.5
  }
  condicion('FORMA DE PAGO', cotizacion.forma_pago)
  condicion('TIEMPO DE ENTREGA', cotizacion.tiempo_entrega)
  condicion('VALIDEZ DE LA OFERTA', cotizacion.validez_oferta)

  if (cotizacion.observaciones) {
    y += 2
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...slate600)
    doc.text(`Obs: ${cotizacion.observaciones}`, M, y, { maxWidth: ANCHO })
    y += 6
  }

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...slate900)
  doc.text('Esperando tener la oportunidad de atender su pedido, quedamos de Ud.', M, y)
  y += 8
  doc.setFont('helvetica', 'bold')
  doc.text('Atentamente.', M, y)
  y += 14

  if (cotizacion.vendedor) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.text(cotizacion.vendedor, M, y)
    y += 10
  }

  // ---- Pie institucional ----
  if (y > 260) {
    doc.addPage()
    y = 20
  }
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...slate400)
  const pie = [
    'of. Central: Calle Los Olivos Mz "Y", Lt. "36" Urb. Virgen del Rosario S.M.P. Lima',
    'Tel.: (01) 6924912  ·  Cel.: 998130415',
    'Email: gerencia@packtechperu.com · packtechsac1@gmail.com'
  ]
  pie.forEach((linea) => {
    doc.text(linea, M, y)
    y += 4
  })

  doc.save(`Cotizacion_${cotizacion.codigo}.pdf`)
}