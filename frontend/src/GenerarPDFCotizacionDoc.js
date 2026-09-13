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
  const azulClaro = [219, 234, 254]
  const slate900 = [15, 23, 42]
  const slate700 = [51, 65, 85]
  const slate600 = [71, 85, 105]
  const slate400 = [148, 163, 184]
  const grisFondo = [248, 250, 252]
  const grisZebra = [246, 248, 251]
  const bordeGris = [100, 116, 139]

  let y = 14

  // ================= ENCABEZADO =================
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...slate900)
  doc.text('COTIZACIÓN', M, y + 6)

  // Caja de datos N° / RUC / FECHA (recuadro real, como en la muestra física)
  const anchoCaja = 58
  const xCaja = M + ANCHO - anchoCaja
  const altoCaja = 18
  const anchoEtiquetaCaja = 16

  doc.setFillColor(...grisFondo)
  doc.rect(xCaja, y - 8, anchoCaja, altoCaja, 'F')
  doc.setDrawColor(...bordeGris)
  doc.setLineWidth(0.3)
  doc.rect(xCaja, y - 8, anchoCaja, altoCaja)
  doc.line(xCaja + anchoEtiquetaCaja, y - 8, xCaja + anchoEtiquetaCaja, y - 8 + altoCaja)
  doc.line(xCaja, y - 8 + altoCaja / 3, xCaja + anchoCaja, y - 8 + altoCaja / 3)
  doc.line(xCaja, y - 8 + (altoCaja / 3) * 2, xCaja + anchoCaja, y - 8 + (altoCaja / 3) * 2)

  const filaCaja = (label, valor, offsetY) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...slate600)
    doc.text(label, xCaja + 1.5, offsetY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...slate900)
    doc.text(String(valor || '-'), xCaja + anchoEtiquetaCaja + 2, offsetY, { maxWidth: anchoCaja - anchoEtiquetaCaja - 3 })
  }
  filaCaja('N°', cotizacion.codigo, y - 2.5)
  filaCaja('RUC', RUC_EMPRESA, y + 3.5)
  filaCaja('FECHA', formatearFecha(cotizacion.fecha), y + 9.5)

  y += 22

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', M, y, 48, 12)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(...azul)
    doc.text('PACKTECH', M, y + 8)
  }

  y += 18

  // ================= BLOQUE CLIENTE =================
  const altoBloqueCliente = 14
  doc.setFillColor(...grisFondo)
  doc.rect(M, y, ANCHO, altoBloqueCliente, 'F')
  doc.setDrawColor(...bordeGris)
  doc.setLineWidth(0.3)
  doc.rect(M, y, ANCHO, altoBloqueCliente)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...slate600)
  doc.text('SR(AS) / ESTIMADA(OS)', M + 3, y + 5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...slate900)
  doc.text(String(cotizacion.cliente || '-'), M + 3, y + 11)

  if (cotizacion.vendedor) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...slate600)
    doc.text(`Vendedor: ${cotizacion.vendedor}`, M + ANCHO - 3, y + 8, { align: 'right' })
  }

  y += altoBloqueCliente + 6

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...slate600)
  doc.text('Es grato dirigirnos a ustedes para proponer a su consideración la siguiente cotización:', M, y)
  y += 6

  // ================= TABLA =================
  const colX = [M, M + 65, M + 90, M + 115, M + 150, M + 190]
  const anchoDescripcion = colX[1] - colX[0] - 4
  const filaAlturaMin = 8
  const alturaLineaTexto = 3.6

  const dibujarCabeceraTabla = () => {
    doc.setFillColor(...azulClaro)
    doc.rect(M, y, ANCHO, filaAlturaMin, 'F')
    doc.setDrawColor(...bordeGris)
    doc.setLineWidth(0.3)
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
  }

  dibujarCabeceraTabla()

  let subtotal = 0

  items.forEach((it, index) => {
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

    // Salvaguarda de salto de página: si no cabe, se repite la cabecera en la página nueva
    if (y + filaAltura > 265) {
      doc.addPage()
      y = 16
      dibujarCabeceraTabla()
    }

    // Zebra striping sutil para lectura tipo hoja de cálculo
    if (index % 2 === 1) {
      doc.setFillColor(...grisZebra)
      doc.rect(M, y, ANCHO, filaAltura, 'F')
    }

    doc.setDrawColor(...bordeGris)
    doc.setLineWidth(0.2)
    doc.rect(M, y, ANCHO, filaAltura)
    colX.slice(1, -1).forEach((x) => doc.line(x, y, x, y + filaAltura))

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...slate900)
    doc.text(lineasDescripcion, colX[0] + 2, y + 5.5)
    doc.setTextColor(...slate700)
    doc.text(lineasMedidas, colX[1] + 2, y + 5.5)
    doc.text(String(it.cantidad ?? '-'), colX[2] + 2, y + 5.5)
    doc.text(String(it.unidad || '-'), colX[3] + 2, y + 5.5)
    doc.text(
      it.precio_unitario ? `${simbolo} ${Number(it.precio_unitario).toFixed(2)}` : '-',
      colX[4] + 2, y + 5.5,
      { maxWidth: colX[5] - colX[4] - 4 }
    )
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...slate900)
    doc.text(
      it.costo_total ? `${simbolo} ${Number(it.costo_total).toFixed(2)}` : '-',
      colX[5] + 2, y + 5.5,
      { maxWidth: (M + ANCHO) - colX[5] - 4 }
    )

    subtotal += it.costo_total || 0
    y += filaAltura
  })

  y += 5

  // ================= TOTALES =================
  const anchoTotales = 62
  const xTotales = M + ANCHO - anchoTotales
  const igv = cotizacion.incluye_igv ? subtotal * 0.18 : 0
  const total = subtotal + igv
  const yInicioTotales = y

  doc.setDrawColor(...bordeGris)
  doc.setLineWidth(0.3)

  doc.setFillColor(...grisFondo)
  doc.rect(xTotales, y, anchoTotales, 8, 'F')
  doc.rect(xTotales, y, anchoTotales, 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...slate600)
  doc.text('SUBTOTAL', xTotales + 3, y + 5.3)
  doc.setTextColor(...slate900)
  doc.text(`${simbolo} ${subtotal.toFixed(2)}`, xTotales + anchoTotales - 3, y + 5.3, { align: 'right' })
  y += 8

  if (cotizacion.incluye_igv) {
    doc.setFillColor(...grisFondo)
    doc.rect(xTotales, y, anchoTotales, 8, 'F')
    doc.rect(xTotales, y, anchoTotales, 8)
    doc.setTextColor(...slate600)
    doc.text('IGV (18%)', xTotales + 3, y + 5.3)
    doc.setTextColor(...slate900)
    doc.text(`${simbolo} ${igv.toFixed(2)}`, xTotales + anchoTotales - 3, y + 5.3, { align: 'right' })
    y += 8
  }

  doc.setFillColor(...azul)
  doc.rect(xTotales, y, anchoTotales, 10, 'F')
  doc.rect(xTotales, y, anchoTotales, 10)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(255, 255, 255)
  doc.text('TOTAL', xTotales + 3, y + 6.7)
  doc.text(`${simbolo} ${total.toFixed(2)}`, xTotales + anchoTotales - 3, y + 6.7, { align: 'right' })
  y += 10

  // Borde exterior completo del bloque de totales
  doc.setDrawColor(...slate900)
  doc.setLineWidth(0.4)
  doc.rect(xTotales, yInicioTotales, anchoTotales, y - yInicioTotales)

  y += 10

  // ================= CONDICIONES COMERCIALES =================
  const hayCondiciones = cotizacion.forma_pago || cotizacion.tiempo_entrega || cotizacion.validez_oferta

  if (hayCondiciones) {
    const filasCondiciones = [
      ['FORMA DE PAGO', cotizacion.forma_pago],
      ['TIEMPO DE ENTREGA', cotizacion.tiempo_entrega],
      ['VALIDEZ DE LA OFERTA', cotizacion.validez_oferta]
    ].filter(([, valor]) => valor)

    const altoFila = 6.5
    const altoBloque = filasCondiciones.length * altoFila
    const anchoEtiqueta = 42

    doc.setDrawColor(...bordeGris)
    doc.setLineWidth(0.3)
    doc.rect(M, y, ANCHO, altoBloque)
    doc.line(M + anchoEtiqueta, y, M + anchoEtiqueta, y + altoBloque)

    filasCondiciones.forEach(([label, valor], i) => {
      const yFila = y + i * altoFila
      if (i > 0) doc.line(M, yFila, M + ANCHO, yFila)

      doc.setFillColor(...grisFondo)
      doc.rect(M, yFila, anchoEtiqueta, altoFila, 'F')
      doc.setDrawColor(...bordeGris)
      doc.rect(M, yFila, anchoEtiqueta, altoFila)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...slate700)
      doc.text(label, M + 2, yFila + 4.3)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...slate900)
      doc.text(String(valor), M + anchoEtiqueta + 3, yFila + 4.3, { maxWidth: ANCHO - anchoEtiqueta - 5 })
    })

    y += altoBloque + 6
  }

  if (cotizacion.observaciones) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(...slate600)
    const lineasObs = doc.splitTextToSize(`Obs: ${cotizacion.observaciones}`, ANCHO)
    doc.text(lineasObs, M, y)
    y += lineasObs.length * 4 + 4
  }

  if (y > 250) {
    doc.addPage()
    y = 20
  }

  y += 4
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...slate900)
  doc.text('Esperando tener la oportunidad de atender su pedido, quedamos de Ud.', M, y)
  y += 8
  doc.setFont('helvetica', 'bold')
  doc.text('Atentamente.', M, y)
  y += 16

  // ================= PIE INSTITUCIONAL =================
  if (y > 265) {
    doc.addPage()
    y = 20
  }

  doc.setDrawColor(...slate400)
  doc.setLineWidth(0.2)
  doc.line(M, y, M + ANCHO, y)
  y += 5

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