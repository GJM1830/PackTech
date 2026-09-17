import jsPDF from 'jspdf'
import { textoSeguro, medirLineas, alturaFilaMultilinea, asegurarEspacio, montoSeguro } from './pdfUtils'

const formatearFecha = (fecha) => {
  if (!fecha) return '-'
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)}`
}

const RUC_EMPRESA = '20554000755'
const ETIQUETA_UNIDAD_PRECIO = { millares: 'millares', unidades: 'unidades', rollos: 'rollos', kg: 'kg' }

export async function generarPDFPedido(pedido) {
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
  const subtotal = items.reduce((s, it) => s + (Number(it.costo_total) || 0), 0)
  const igv = pedido.incluye_igv ? subtotal * 0.18 : 0
  const total = subtotal + igv

  const M = 12
  const ANCHO = 210 - M * 2

  // Paleta: gris (no celeste) en las casillas rellenas, porque esta hoja se imprime.
  const azul = [30, 64, 175]
  const slate900 = [15, 23, 42]
  const slate700 = [51, 65, 85]
  const slate600 = [71, 85, 105]
  const slate400 = [148, 163, 184]
  const grisFondo = [248, 250, 252]
  const grisZebra = [246, 248, 251]
  const grisCabecera = [226, 232, 240]
  const grisDestacado = [241, 245, 249]
  const bordeGris = [100, 116, 139]

  let y = 14

  // ================= ENCABEZADO =================
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', M, y, 42, 11)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...azul)
    doc.text('PACKTECH', M, y + 7)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(...slate900)
  doc.text(`Pedido - ${textoSeguro(pedido.codigo_base || pedido.codigo)}`, M + ANCHO / 2, y + 8, { align: 'center' })

  y += 18

  // Caja RUC / FECHA (gris, igual estructura que en Cotización)
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
    doc.text(textoSeguro(valor), xCaja + 18, offsetY, { maxWidth: anchoCaja - 20 })
  }
  filaCaja('RUC', RUC_EMPRESA, y + 4.5)
  filaCaja('FECHA', formatearFecha(pedido.fecha), y + 10.5)

  y += altoCaja + 8

  // ================= BLOQUE CLIENTE =================
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
  doc.text(textoSeguro(pedido.cliente), M + 3, y + 11, { maxWidth: ANCHO - 6 })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...slate600)
  doc.text('CON RUC / DNI', M + 3, y + 16.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...slate900)
  doc.text(textoSeguro(pedido.ruc), M + 28, y + 16.5)

  if (pedido.vendedor) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...slate600)
    doc.text(`Vendedor: ${textoSeguro(pedido.vendedor)}`, M + ANCHO - 3, y + 8, { align: 'right' })
  }

  y += altoBloqueCliente + 6

  // ================= DATOS DE ENTREGA (tabla flotante, propia del pedido) =================
  const filasEntrega = [
    ['F. ENTREGA', pedido.fecha_entrega ? formatearFecha(pedido.fecha_entrega) : null],
    ['DIRECCIÓN DE ENTREGA', pedido.direccion_entrega],
    ['N° DE CONTACTO', pedido.numero_contacto],
    ['EMAIL DEL CLIENTE', pedido.email_cliente],
    ['TELÉFONO DEL CLIENTE', pedido.telefono_cliente]
  ].filter(([, valor]) => valor)

  if (filasEntrega.length > 0) {
    const anchoEtiqueta = 48
    const altoFilaMin = 6.5
    const alturaLineaDato = 3.6

    const filasDatos = filasEntrega.map(([label, valor]) => {
      const lineasValor = medirLineas(doc, valor, ANCHO - anchoEtiqueta - 5)
      const alto = alturaFilaMultilinea([lineasValor], alturaLineaDato, altoFilaMin, 2.8)
      return { label, lineasValor, alto }
    })
    const altoBloque = filasDatos.reduce((s, f) => s + f.alto, 0)

    y = asegurarEspacio(doc, y, altoBloque, 270, 16)

    doc.setDrawColor(...bordeGris)
    doc.setLineWidth(0.3)
    doc.rect(M, y, ANCHO, altoBloque)
    doc.line(M + anchoEtiqueta, y, M + anchoEtiqueta, y + altoBloque)

    let yFila = y
    filasDatos.forEach(({ label, lineasValor, alto }, i) => {
      if (i > 0) doc.line(M, yFila, M + ANCHO, yFila)

      doc.setFillColor(...grisFondo)
      doc.rect(M, yFila, anchoEtiqueta, alto, 'F')
      doc.setDrawColor(...bordeGris)
      doc.rect(M, yFila, anchoEtiqueta, alto)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...slate700)
      doc.text(label, M + 2, yFila + 4.3)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(...slate900)
      doc.text(lineasValor, M + anchoEtiqueta + 3, yFila + 4.3)

      yFila += alto
    })

    y += altoBloque + 6
  } else {
    y += 2
  }

  // ================= TABLA DE PRODUCTOS =================
  const colX = [M, M + 68, M + 94, M + 110, M + 130, M + 156]
  const anchoDescripcion = colX[1] - colX[0] - 4
  const filaAlturaMin = 8
  const alturaLineaTexto = 3.6

  const dibujarCabeceraTabla = () => {
    doc.setFillColor(...grisCabecera)
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
    doc.text('TOTAL', colX[5] + 2, y + 5.5)
    y += filaAlturaMin
  }

  y = asegurarEspacio(doc, y, filaAlturaMin, 265, 16)
  dibujarCabeceraTabla()

  const anchoPUnitario = colX[5] - colX[4] - 4
  const anchoTotalCelda = (M + ANCHO) - colX[5] - 4

  items.forEach((it, index) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)

    const cantidadTabla = it.unidad_precio && it.unidad_precio !== 'kg' ? it.cantidad_precio : it.cantidad
    const unidadTabla = it.unidad_precio ? (ETIQUETA_UNIDAD_PRECIO[it.unidad_precio] || 'kg') : 'kg'
    const simboloItem = it.moneda === 'Dólares' ? '$' : 'S/'

    // El backend guarda la descripción combinada con las medidas ("Producto / 2.2.2")
    // para pantallas que no tienen columna de medidas propia. Aquí SÍ hay columna
    // de medidas, así que solo para esta tabla se recorta el sufijo duplicado.
    // El dato real (it.descripcion) no se toca: sigue intacto para el resto del sistema.
    let descripcionMostrada = textoSeguro(it.descripcion)
    const medidasTexto = it.medidas ? String(it.medidas).trim() : ''
    if (medidasTexto && descripcionMostrada.endsWith(` / ${medidasTexto}`)) {
      descripcionMostrada = descripcionMostrada.slice(0, -(` / ${medidasTexto}`.length))
    }

    // Cada columna con texto potencialmente largo se mide por separado; la fila
    // toma el alto de la que necesite más líneas, así ninguna se sale de su celda.
    const lineasDescripcion = medirLineas(doc, descripcionMostrada, anchoDescripcion)
    const lineasMedidas = medirLineas(doc, it.medidas, colX[2] - colX[1] - 4)
    const lineasPUnit = medirLineas(doc, it.precio_unitario ? montoSeguro(it.precio_unitario, simboloItem) : '-', anchoPUnitario)
    const lineasTotal = medirLineas(doc, it.costo_total ? montoSeguro(it.costo_total, simboloItem) : '-', anchoTotalCelda)

    const filaAltura = alturaFilaMultilinea(
      [lineasDescripcion, lineasMedidas, lineasPUnit, lineasTotal],
      alturaLineaTexto,
      filaAlturaMin
    )

    // Salvaguarda de salto de página: si no cabe, se repite la cabecera en la página nueva
    if (y + filaAltura > 265) {
      doc.addPage()
      y = 16
      dibujarCabeceraTabla()
    }

    // Zebra striping muy suave para lectura tipo hoja de cálculo
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
    doc.text(textoSeguro(cantidadTabla), colX[2] + 2, y + 5.5)
    doc.text(unidadTabla, colX[3] + 2, y + 5.5)
    doc.text(lineasPUnit, colX[4] + 2, y + 5.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...slate900)
    doc.text(lineasTotal, colX[5] + 2, y + 5.5)

    y += filaAltura
  })

  y += 5

  // ================= TOTALES =================
  y = asegurarEspacio(doc, y, 30, 270, 16)

  const anchoTotales = 62
  const xTotales = M + ANCHO - anchoTotales

  const filas = [{ label: 'SUBTOTAL', valor: subtotal, esTotal: false }]
  if (pedido.incluye_igv) filas.push({ label: 'IGV (18%)', valor: igv, esTotal: false })
  filas.push({ label: 'TOTAL', valor: total, esTotal: true })

  const alturaFila = 9
  const alturaBloque = filas.length * alturaFila
  const yInicioTotales = y

  filas.forEach((f, i) => {
    if (f.esTotal) {
      doc.setFillColor(...grisDestacado)
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
    doc.setTextColor(...slate900)
    doc.text(montoSeguro(f.valor, simbolo), xTotales + anchoTotales - 3, yFila, { align: 'right' })
  })

  y = yInicioTotales + alturaBloque + 10

  // ================= CONDICIONES FIJAS =================
  y = asegurarEspacio(doc, y, 22, 280, 16)

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

  if (pedido.incluye_igv != null || pedido.observaciones_pedido) {
    y = asegurarEspacio(doc, y, 16, 280, 16)
    y += 4
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...slate600)
    doc.text(pedido.incluye_igv ? 'Precio incluye IGV' : 'Precio no incluye IGV', M, y)
    if (pedido.observaciones_pedido) {
      y += 4
      doc.setFont('helvetica', 'normal')
      doc.text(`Obs: ${textoSeguro(pedido.observaciones_pedido)}`, M, y, { maxWidth: ANCHO })
    }
  }

  if (pedido.imagen_url) {
    // La imagen mide 60mm de alto; si no cabe, se dibuja en una página nueva
    y = asegurarEspacio(doc, y, 74, 280, 16)
    y += 10
    const formato = pedido.imagen_url.includes('image/png') ? 'PNG' : 'JPEG'
    try {
      doc.addImage(pedido.imagen_url, formato, M, y, 60, 60)
      y += 64
    } catch {
      // si la imagen no es válida para el PDF, se omite sin romper la descarga
    }
  }

  y = asegurarEspacio(doc, y, 20, 280, 16)
  y += 14
  doc.setDrawColor(...slate400)
  doc.line(M, y, M + 60, y)
  doc.setFontSize(7.5)
  doc.setTextColor(...slate600)
  doc.text('Firma / Huella', M, y + 4)

  doc.save(`Pedido_${pedido.codigo_base || pedido.codigo}.pdf`)
}