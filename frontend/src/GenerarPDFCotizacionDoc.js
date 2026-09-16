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
  const ANCHO = 210 - M * 2 // 186mm imprimibles, de x=12 a x=198

  const azul = [30, 64, 175]
  const azulClaro = [219, 234, 254]
  const azulMuySuave = [239, 246, 255]
  const slate900 = [15, 23, 42]
  const slate700 = [51, 65, 85]
  const slate600 = [71, 85, 105]
  const slate400 = [148, 163, 184]
  const grisFondo = [248, 250, 252]
  const grisZebra = [246, 248, 251]
  const bordeGris = [100, 116, 139]

  let y = 14

  // ================= ENCABEZADO =================
  // Logo a la izquierda
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', M, y, 42, 11)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...azul)
    doc.text('PACKTECH', M, y + 7)
  }

  // Título centrado: "Cotización - (código)"
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(...slate900)
  doc.text(`Cotización - ${cotizacion.codigo}`, M + ANCHO / 2, y + 8, { align: 'center' })

  y += 18

  // Caja RUC / FECHA (a la derecha, debajo del encabezado; el N° ya va en el título)
  const anchoCaja = 52
  const xCaja = M + ANCHO - anchoCaja
  const altoCaja = 12

  doc.setFillColor(...grisFondo)
  doc.rect(xCaja, y, anchoCaja, altoCaja, 'F')
  doc.setDrawColor(...bordeGris)
  doc.setLineWidth(0.3)
  doc.rect(xCaja, y, anchoCaja, altoCaja)
  doc.line(xCaja + 16, y, xCaja + 16, y + altoCaja)
  doc.line(xCaja, y + altoCaja / 2, xCaja + anchoCaja, y + altoCaja / 2)

  const filaCaja = (label, valor, offsetY) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...slate600)
    doc.text(label, xCaja + 1.5, offsetY)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...slate900)
    doc.text(String(valor || '-'), xCaja + 18, offsetY, { maxWidth: anchoCaja - 20 })
  }
  filaCaja('RUC', RUC_EMPRESA, y + 4.5)
  filaCaja('FECHA', formatearFecha(cotizacion.fecha), y + 10.5)

  y += altoCaja + 8

  // ================= BLOQUE CLIENTE =================
  // Sr(as)/Estimada(os) + nombre, y debajo "Con RUC / DNI" + el número.
  const altoBloqueCliente = 20
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

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...slate600)
  doc.text('CON RUC / DNI', M + 3, y + 16.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...slate900)
  doc.text(String(cotizacion.ruc || '-'), M + 28, y + 16.5)

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
  // Anchos calculados para sumar EXACTO el ancho imprimible (186mm): 68+26+16+20+26+30 = 186
  const colX = [M, M + 68, M + 94, M + 110, M + 130, M + 156]
  const anchoDescripcion = colX[1] - colX[0] - 4
  const filaAlturaMin = 8
  const alturaLineaTexto = 3.6

  const dibujarCabeceraTabla = () => {
    doc.setFillColor(...azulClaro)
    doc.rect(M, y, ANCHO, filaAlturaMin, 'F')
    doc.setDrawColor(...bordeGris)
    doc.setLineWidth(0.3)
    doc.rect(M, y, ANCHO, filaAlturaMin)
    colX.slice(1).forEach((x) => doc.line(x, y, x, y + filaAlturaMin))
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

    // Descripción + procesos como una sola frase: "producto, con procesos: A, B, C"
    const descripcionBase = it.descripcion || '-'
    const procesos = it.procesos_plan ? it.procesos_plan.split(',').filter(Boolean) : []
    const descripcionCompleta = procesos.length > 0
      ? `${descripcionBase}, con procesos: ${procesos.join(', ')}`
      : descripcionBase
    const lineasDescripcion = doc.splitTextToSize(descripcionCompleta, anchoDescripcion)

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

    // Zebra striping muy suave (gris casi blanco) para lectura tipo hoja de cálculo
    if (index % 2 === 1) {
      doc.setFillColor(...grisZebra)
      doc.rect(M, y, ANCHO, filaAltura, 'F')
    }

    doc.setDrawColor(...bordeGris)
    doc.setLineWidth(0.2)
    doc.rect(M, y, ANCHO, filaAltura)
    colX.slice(1).forEach((x) => doc.line(x, y, x, y + filaAltura))

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

    // Fila de Clisse: va justo debajo del producto, dentro de las mismas columnas
    if (it.tiene_clisse) {
      const simboloClisse = it.moneda_clisse === 'Dólares' ? '$' : 'S/'
      const descripcionClisse = `Clisse ${it.nombre_clisse || '-'}`
      const lineasDescClisse = doc.splitTextToSize(descripcionClisse, anchoDescripcion)
      const filaAlturaClisse = Math.max(filaAlturaMin, lineasDescClisse.length * alturaLineaTexto + 4.5)

      if (y + filaAlturaClisse > 265) {
        doc.addPage()
        y = 16
        dibujarCabeceraTabla()
      }

      doc.setFillColor(...azulMuySuave)
      doc.rect(M, y, ANCHO, filaAlturaClisse, 'F')
      doc.setDrawColor(...bordeGris)
      doc.setLineWidth(0.2)
      doc.rect(M, y, ANCHO, filaAlturaClisse)
      colX.slice(1).forEach((x) => doc.line(x, y, x, y + filaAlturaClisse))

      doc.setFont('helvetica', 'italic')
      doc.setFontSize(7.5)
      doc.setTextColor(...azul)
      doc.text(lineasDescClisse, colX[0] + 2, y + 5.5)
      doc.text(`${it.cantidad_colores ?? '-'} Colores`, colX[1] + 2, y + 5.5)
      doc.text('1', colX[2] + 2, y + 5.5)
      doc.text('-', colX[3] + 2, y + 5.5)
      doc.text(
        it.precio_clisse ? `${simboloClisse} ${Number(it.precio_clisse).toFixed(2)}` : '-',
        colX[4] + 2, y + 5.5,
        { maxWidth: colX[5] - colX[4] - 4 }
      )
      doc.text(
        it.precio_clisse ? `${simboloClisse} ${Number(it.precio_clisse).toFixed(2)}` : '-',
        colX[5] + 2, y + 5.5,
        { maxWidth: (M + ANCHO) - colX[5] - 4 }
      )

      y += filaAlturaClisse
    }
  })

  y += 5

  // ================= TOTALES =================
  // Un solo trazo de borde consistente (antes se dibujaba un borde por fila + un borde
  // exterior más grueso encima, y eso producía líneas de grosor distinto). Sin relleno
  // oscuro: solo un tinte muy suave bajo la fila de TOTAL para que se imprima bien.
  const anchoTotales = 62
  const xTotales = M + ANCHO - anchoTotales
  const igv = cotizacion.incluye_igv ? subtotal * 0.18 : 0
  const total = subtotal + igv

  const filas = [{ label: 'SUBTOTAL', valor: subtotal, esTotal: false }]
  if (cotizacion.incluye_igv) filas.push({ label: 'IGV (18%)', valor: igv, esTotal: false })
  filas.push({ label: 'TOTAL', valor: total, esTotal: true })

  const alturaFila = 9
  const alturaBloque = filas.length * alturaFila
  const yInicioTotales = y

  filas.forEach((f, i) => {
    if (f.esTotal) {
      doc.setFillColor(...azulMuySuave)
      doc.rect(xTotales, yInicioTotales + i * alturaFila, anchoTotales, alturaFila, 'F')
    }
  })

  doc.setDrawColor(...bordeGris)
  doc.setLineWidth(0.3)
  doc.rect(xTotales, yInicioTotales, anchoTotales, alturaBloque)
  for (let i = 1; i < filas.length; i++) {
    const yLinea = yInicioTotales + i * alturaFila
    doc.line(xTotales, yLinea, xTotales + anchoTotales, yLinea)
  }

  filas.forEach((f, i) => {
    const yFila = yInicioTotales + i * alturaFila + alturaFila / 2 + 1.5
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(f.esTotal ? 10 : 8.5)
    doc.setTextColor(...(f.esTotal ? slate900 : slate600))
    doc.text(f.label, xTotales + 3, yFila)
    doc.setTextColor(...(f.esTotal ? azul : slate900))
    doc.text(`${simbolo} ${f.valor.toFixed(2)}`, xTotales + anchoTotales - 3, yFila, { align: 'right' })
  })

  y = yInicioTotales + alturaBloque + 10

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
  doc.text(cotizacion.vendedor ? `Atentamente, ${cotizacion.vendedor}` : 'Atentamente.', M, y)
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