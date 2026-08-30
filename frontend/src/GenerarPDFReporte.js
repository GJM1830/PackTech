import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const M = 12
const ANCHO_PAG = 210 - M * 2

const COLOR = {
  slate900: [15, 23, 42],
  slate700: [51, 65, 85],
  slate600: [71, 85, 105],
  slate400: [148, 163, 184],
  slate200: [226, 232, 240],
  slate100: [241, 245, 249],
  azul: [29, 78, 216],
  azulClaro: [59, 130, 246],
  verde: [22, 163, 74],
  ambar: [217, 119, 6],
  rojo: [220, 38, 38],
  rojoClaro: [239, 68, 68]
}

const COLORES_MERMA_PDF = [
  [239, 68, 68], [249, 115, 22], [234, 179, 8], [132, 204, 22],
  [6, 182, 212], [139, 92, 246], [236, 72, 153], [100, 116, 139]
]

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

function dibujarEncabezado(doc, logoBase64, titulo, subtitulo) {
  const y = 14
  doc.setDrawColor(...COLOR.slate900)
  doc.setLineWidth(0.3)
  doc.line(M, y + 16, M + ANCHO_PAG, y + 16)

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', M, y - 2, 58, 14.5)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...COLOR.azul)
    doc.text('PACKTECH', M, y + 6)
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...COLOR.slate900)
  doc.text(titulo, M + ANCHO_PAG, y + 4, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...COLOR.slate600)
  doc.text(subtitulo, M + ANCHO_PAG, y + 10, { align: 'right', maxWidth: ANCHO_PAG - 60 })

  return y + 24
}

function dibujarTarjetaKPI(doc, x, y, w, h, titulo, valor, unidad, colorAcento, delta) {
  doc.setFillColor(...COLOR.slate100)
  doc.roundedRect(x, y, w, h, 1.5, 1.5, 'F')
  doc.setFillColor(...colorAcento)
  doc.rect(x, y, 1.4, h, 'F')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...COLOR.slate600)
  doc.text(String(titulo).toUpperCase(), x + 4, y + 6, { maxWidth: w - 6 })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12.5)
  doc.setTextColor(...COLOR.slate900)
  doc.text(`${valor}${unidad ? ' ' + unidad : ''}`, x + 4, y + 13.5, { maxWidth: w - 6 })

  if (delta) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.3)
    doc.setTextColor(...(delta.bueno ? COLOR.verde : COLOR.rojo))
    doc.text(delta.texto, x + 4, y + h - 2.5, { maxWidth: w - 6 })
  }
}

function calcularDelta(actual, anterior, positivoEsBueno = true) {
  if (anterior == null || anterior === 0 || actual == null) return null
  const cambio = ((actual - anterior) / anterior) * 100
  if (!isFinite(cambio)) return null
  const estable = Math.abs(cambio) < 0.5
  const subio = cambio > 0
  const bueno = positivoEsBueno ? subio : !subio
  const flecha = estable ? '=' : subio ? '^' : 'v'
  return { texto: `${flecha} ${Math.abs(cambio).toFixed(1)}% vs. anterior`, bueno: estable ? true : bueno }
}

// Gráfico de barras horizontal agrupado, dibujado a mano (entrada/salida/merma, etc.)
function dibujarGraficoBarras(doc, x, y, ancho, datos, seriesConfig) {
  const anchoEtiqueta = 34
  const anchoBarras = ancho - anchoEtiqueta - 4
  const maxValor = Math.max(1, ...datos.flatMap((d) => seriesConfig.map((s) => d[s.key] || 0)))
  const altoBarra = 3.4
  const espacioSerie = 4.3
  const espacioGrupo = 3

  let yActual = y
  datos.forEach((d) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.3)
    doc.setTextColor(...COLOR.slate700)
    const etiquetaCorta = String(d.etiqueta).length > 17 ? String(d.etiqueta).slice(0, 16) + '…' : String(d.etiqueta)
    doc.text(etiquetaCorta, x, yActual + 3.5)

    let yBarra = yActual
    seriesConfig.forEach((serie) => {
      const valor = d[serie.key] || 0
      const anchoBarra = maxValor > 0 ? (valor / maxValor) * anchoBarras : 0
      doc.setFillColor(...serie.color)
      doc.rect(x + anchoEtiqueta, yBarra, Math.max(anchoBarra, 0.4), altoBarra, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.3)
      doc.setTextColor(...COLOR.slate600)
      doc.text(fmt(valor), x + anchoEtiqueta + anchoBarra + 1.5, yBarra + altoBarra - 0.6)
      yBarra += espacioSerie
    })

    yActual += seriesConfig.length * espacioSerie + espacioGrupo
  })

  return yActual
}

function dibujarLeyenda(doc, x, y, items) {
  let xActual = x
  items.forEach((item) => {
    doc.setFillColor(...item.color)
    doc.rect(xActual, y, 3, 3, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(...COLOR.slate600)
    doc.text(item.texto, xActual + 4.5, y + 2.6)
    xActual += 24
  })
}

function piePagina(doc) {
  const paginas = doc.internal.getNumberOfPages()
  const generado = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })
  for (let i = 1; i <= paginas; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.8)
    doc.setTextColor(...COLOR.slate400)
    doc.text(`Generado el ${generado} · PackTech`, M, 290)
    doc.text(`Página ${i} de ${paginas}`, M + ANCHO_PAG, 290, { align: 'right' })
  }
}

// ===================================================================
// VISTA GENERAL
// ===================================================================
function generarGeneral(doc, logo, config) {
  const { periodoLabel, desde, hasta, agrupacionLabel, datos, totales, totalesAnterior } = config

  let y = dibujarEncabezado(
    doc, logo, 'REPORTE DE PRODUCCIÓN',
    `${periodoLabel}${desde ? ` · ${formatearFecha(desde)} – ${formatearFecha(hasta)}` : ''} · Agrupado por ${agrupacionLabel}`
  )

  const anchoCard = (ANCHO_PAG - 9) / 4
  const alturaCard = 20
  const kpis = [
    { titulo: 'Entrada total', valor: fmt(totales.entrada), unidad: 'kg', color: COLOR.slate400,
      delta: calcularDelta(totales.entrada, totalesAnterior?.entrada) },
    { titulo: 'Salida total', valor: fmt(totales.salida), unidad: 'kg', color: COLOR.azulClaro,
      delta: calcularDelta(totales.salida, totalesAnterior?.salida) },
    { titulo: 'Merma total', valor: fmt(totales.merma), unidad: 'kg', color: COLOR.rojoClaro,
      delta: calcularDelta(totales.merma, totalesAnterior?.merma, false) },
    { titulo: 'Sin merma reg.', valor: totales.sinMerma, unidad: `de ${totales.movimientos}`, color: COLOR.ambar,
      delta: calcularDelta(totales.sinMerma, totalesAnterior?.sinMerma, false) }
  ]
  kpis.forEach((k, i) => {
    dibujarTarjetaKPI(doc, M + i * (anchoCard + 3), y, anchoCard, alturaCard, k.titulo, k.valor, k.unidad, k.color, k.delta)
  })
  y += alturaCard + 9

  if (datos.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...COLOR.slate400)
    doc.text('Sin datos para este periodo.', M, y)
    piePagina(doc)
    doc.save(`Reporte_Produccion_${desde || 'todo'}_a_${hasta || 'todo'}.pdf`)
    return
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...COLOR.slate900)
  doc.text(`Entrada / Salida / Merma por ${agrupacionLabel.toLowerCase()}`, M, y)
  y += 6

  const seriesConfig = [
    { key: 'entrada', color: COLOR.slate400 },
    { key: 'salida', color: COLOR.azulClaro },
    { key: 'merma', color: COLOR.rojoClaro }
  ]
  const datosOrdenados = datos.slice().sort((a, b) => b.entrada - a.entrada)
  y = dibujarGraficoBarras(doc, M, y, ANCHO_PAG, datosOrdenados, seriesConfig)

  dibujarLeyenda(doc, M, y, [
    { color: COLOR.slate400, texto: 'Entrada' },
    { color: COLOR.azulClaro, texto: 'Salida' },
    { color: COLOR.rojoClaro, texto: 'Merma' }
  ])
  y += 10

  autoTable(doc, {
    startY: y,
    head: [[agrupacionLabel, 'Entrada', 'Salida', 'Merma', '% Merma', 'Sin merma', 'Movs.']],
    body: datosOrdenados.map((d) => [
      d.etiqueta,
      fmt(d.entrada),
      fmt(d.salida),
      fmt(d.merma),
      d.entrada > 0 ? `${((d.merma / d.entrada) * 100).toFixed(1)}%` : '-',
      d.movimientos_sin_merma > 0 ? `${d.movimientos_sin_merma} de ${d.movimientos}` : 'Completo',
      d.movimientos
    ]),
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5 },
    margin: { left: M, right: M }
  })

  piePagina(doc)
  doc.save(`Reporte_Produccion_${desde || 'todo'}_a_${hasta || 'todo'}.pdf`)
}

// ===================================================================
// VISTA POR TIPO DE MERMA
// ===================================================================
function generarTipoMerma(doc, logo, config) {
  const { periodoLabel, desde, hasta, datos, totalPeso } = config

  let y = dibujarEncabezado(
    doc, logo, 'REPORTE DE MERMA POR TIPO',
    `${periodoLabel}${desde ? ` · ${formatearFecha(desde)} – ${formatearFecha(hasta)}` : ''}`
  )

  if (datos.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...COLOR.slate400)
    doc.text('Sin mermas registradas en este periodo.', M, y)
    piePagina(doc)
    doc.save(`Reporte_Merma_${desde || 'todo'}_a_${hasta || 'todo'}.pdf`)
    return
  }

  const ordenado = datos.slice().sort((a, b) => b.peso - a.peso)
  const top3 = ordenado.slice(0, 3)

  dibujarTarjetaKPI(doc, M, y, 58, 20, 'Merma total detallada', fmt(totalPeso), 'kg', COLOR.rojoClaro, null)
  top3.forEach((d, i) => {
    dibujarTarjetaKPI(
      doc, M + 61 + i * 46, y, 44, 20,
      `#${i + 1} causa: ${d.etiqueta}`, fmt(d.peso), 'kg',
      COLORES_MERMA_PDF[i % COLORES_MERMA_PDF.length], null
    )
  })
  y += 28

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...COLOR.slate900)
  doc.text('Merma por tipo', M, y)
  y += 6

  const maxValor = Math.max(1, ...ordenado.map((d) => d.peso))
  const anchoEtiqueta = 40
  const anchoBarras = ANCHO_PAG - anchoEtiqueta - 4

  ordenado.forEach((d, i) => {
    const color = COLORES_MERMA_PDF[i % COLORES_MERMA_PDF.length]
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.3)
    doc.setTextColor(...COLOR.slate700)
    const etq = d.etiqueta.length > 22 ? d.etiqueta.slice(0, 21) + '…' : d.etiqueta
    doc.text(etq, M, y + 3)
    const anchoBarra = (d.peso / maxValor) * anchoBarras
    doc.setFillColor(...color)
    doc.rect(M + anchoEtiqueta, y, Math.max(anchoBarra, 0.4), 4, 'F')
    doc.setFontSize(6.3)
    doc.setTextColor(...COLOR.slate600)
    doc.text(
      `${fmt(d.peso)} kg (${totalPeso > 0 ? ((d.peso / totalPeso) * 100).toFixed(1) : 0}%)`,
      M + anchoEtiqueta + anchoBarra + 1.5, y + 3
    )
    y += 7
  })
  y += 6

  autoTable(doc, {
    startY: y,
    head: [['Tipo de merma', 'Peso (kg)', '% del total', 'Registros']],
    body: ordenado.map((d) => [
      d.etiqueta, fmt(d.peso), totalPeso > 0 ? `${((d.peso / totalPeso) * 100).toFixed(1)}%` : '-', d.registros
    ]),
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5 },
    margin: { left: M, right: M }
  })

  piePagina(doc)
  doc.save(`Reporte_Merma_${desde || 'todo'}_a_${hasta || 'todo'}.pdf`)
}

// ===================================================================
// VISTA POR ORDEN
// ===================================================================
function generarOrden(doc, logo, config) {
  const { reporte } = config

  let y = dibujarEncabezado(doc, logo, 'REPORTE DE ORDEN', `${reporte.codigo} · ${reporte.cliente}`)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...COLOR.slate600)
  doc.text(
    `${reporte.descripcion || 'Sin descripción'} · ${fmt(reporte.cantidad)} ${reporte.unidad} planificado`,
    M, y
  )
  y += 8

  const anchoCard = (ANCHO_PAG - 6) / 3
  dibujarTarjetaKPI(doc, M, y, anchoCard, 20, 'Entrada total', fmt(reporte.total_entrada), '', COLOR.slate400, null)
  dibujarTarjetaKPI(doc, M + anchoCard + 3, y, anchoCard, 20, 'Salida total', fmt(reporte.total_salida), '', COLOR.azulClaro, null)
  dibujarTarjetaKPI(doc, M + (anchoCard + 3) * 2, y, anchoCard, 20, 'Merma total', fmt(reporte.total_merma), '', COLOR.rojoClaro, null)
  y += 28

  if (reporte.pasos.length === 0) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(...COLOR.slate400)
    doc.text('Esta orden aún no tiene movimientos registrados.', M, y)
  } else {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...COLOR.slate900)
    doc.text('Recorrido por proceso', M, y)
    y += 6

    const seriesConfig = [
      { key: 'entrada', color: COLOR.slate400 },
      { key: 'salida', color: COLOR.azulClaro },
      { key: 'merma', color: COLOR.rojoClaro }
    ]
    y = dibujarGraficoBarras(
      doc, M, y, ANCHO_PAG,
      reporte.pasos.map((p) => ({ etiqueta: p.proceso, entrada: p.entrada, salida: p.salida, merma: p.merma })),
      seriesConfig
    )
    dibujarLeyenda(doc, M, y, [
      { color: COLOR.slate400, texto: 'Entrada' },
      { color: COLOR.azulClaro, texto: 'Salida' },
      { color: COLOR.rojoClaro, texto: 'Merma' }
    ])
    y += 10

    autoTable(doc, {
      startY: y,
      head: [['Proceso', 'Máquina', 'Operario', 'Entrada', 'Salida', 'Merma', 'Fecha', 'Hora']],
      body: reporte.pasos.map((p) => [
        p.proceso, p.maquina || '-', p.operario, fmt(p.entrada), fmt(p.salida), fmt(p.merma),
        formatearFecha(p.fecha), p.hora?.slice(0, 5) || '-'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 7.5 },
      bodyStyles: { fontSize: 7.5 },
      margin: { left: M, right: M }
    })
  }

  piePagina(doc)
  doc.save(`Reporte_Orden_${reporte.codigo}.pdf`)
}

// ===================================================================
// VISTA ALERTAS
// ===================================================================
function generarAlertas(doc, logo, config) {
  const { periodoLabel, desde, hasta, datos, parametros } = config

  let y = dibujarEncabezado(
    doc, logo, 'REPORTE DE ALERTAS DE PRODUCCIÓN',
    `${periodoLabel}${desde ? ` · ${formatearFecha(desde)} – ${formatearFecha(hasta)}` : ''}`
  )

  const resumen = [
    { titulo: 'OP sin movimiento', valor: datos.ordenes_sin_movimientos.length,
      color: datos.ordenes_sin_movimientos.length ? COLOR.ambar : COLOR.verde },
    { titulo: 'OP estancadas', valor: datos.ordenes_estancadas.length,
      color: datos.ordenes_estancadas.length ? COLOR.rojoClaro : COLOR.verde },
    { titulo: 'Días con pocos movs.', valor: datos.dias_pocos_movimientos.length,
      color: datos.dias_pocos_movimientos.length ? COLOR.ambar : COLOR.verde },
    { titulo: 'Movs. sin merma', valor: datos.movimientos_sin_merma.length,
      color: datos.movimientos_sin_merma.length ? COLOR.ambar : COLOR.verde },
    { titulo: 'Máquinas c/ merma', valor: datos.maquinas_top_merma.length, color: COLOR.slate400 },
    { titulo: 'Merma anormal', valor: datos.ordenes_merma_excesiva.length,
      color: datos.ordenes_merma_excesiva.length ? COLOR.rojoClaro : COLOR.verde }
  ]
  const anchoCard = (ANCHO_PAG - 15) / 6
  resumen.forEach((r, i) => {
    dibujarTarjetaKPI(doc, M + i * (anchoCard + 3), y, anchoCard, 18, r.titulo, r.valor, '', r.color, null)
  })
  y += 26

  const seccion = (titulo, encabezados, filas, notaVacia) => {
    if (y > 250) { doc.addPage(); y = 16 }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...COLOR.slate900)
    doc.text(titulo, M, y)
    y += 4
    if (filas.length === 0) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(...COLOR.verde)
      doc.text(`✓ ${notaVacia}`, M, y + 3)
      y += 11
      return
    }
    autoTable(doc, {
      startY: y,
      head: [encabezados],
      body: filas,
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      margin: { left: M, right: M }
    })
    y = doc.lastAutoTable.finalY + 8
  }

  seccion(
    'Órdenes sin ningún movimiento',
    ['N° Pedido', 'Cliente', 'Fecha de creación'],
    datos.ordenes_sin_movimientos.map((o) => [o.codigo, o.cliente, formatearFecha(o.fecha)]),
    'Todas las órdenes tienen movimientos.'
  )

  seccion(
    `Órdenes estancadas (${parametros.diasEstancado}+ días sin movimiento)`,
    ['N° Pedido', 'Cliente', 'Último proceso', 'Días parada', 'Último movimiento'],
    datos.ordenes_estancadas.map((o) => [
      o.codigo, o.cliente, o.ultimo_proceso, `${o.dias_sin_movimiento}d`, formatearFecha(o.fecha_ultimo_movimiento)
    ]),
    'Ninguna orden está estancada.'
  )

  seccion(
    `Días con ${parametros.umbralPocos} o menos movimientos (últimos 14 días)`,
    ['Fecha', 'Movimientos'],
    datos.dias_pocos_movimientos.map((d) => [formatearFecha(d.fecha), d.movimientos]),
    'Actividad normal todos los días.'
  )

  seccion(
    'Movimientos sin merma registrada',
    ['N° Pedido', 'Proceso', 'Máquina', 'Fecha'],
    datos.movimientos_sin_merma.map((m) => [m.codigo_orden, m.proceso, m.maquina || '-', formatearFecha(m.fecha)]),
    'Todos los movimientos tienen merma registrada.'
  )

  seccion(
    'Máquinas con más merma acumulada',
    ['Máquina', 'Merma (kg)', 'Registros'],
    datos.maquinas_top_merma.map((m) => [m.maquina, fmt(m.merma), m.registros]),
    'Sin mermas registradas en el periodo.'
  )

  seccion(
    'Merma anormalmente alta (vs. promedio del mismo proceso)',
    ['N° Pedido', 'Proceso', 'Máquina', 'Merma real', 'Prom. proceso', 'Fecha'],
    datos.ordenes_merma_excesiva.map((m) => [
      m.codigo_orden, m.proceso, m.maquina || '-', `${fmt(m.merma_real)} kg`, `${fmt(m.promedio_proceso)} kg`, formatearFecha(m.fecha)
    ]),
    'Sin anomalías detectadas (o historial insuficiente).'
  )

  piePagina(doc)
  doc.save(`Reporte_Alertas_${desde || 'todo'}_a_${hasta || 'todo'}.pdf`)
}

// ===================================================================
// ENTRADA PÚBLICA
// ===================================================================
export async function generarPDFReporte(config) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const logo = await cargarLogo()

  if (config.tipo === 'general') return generarGeneral(doc, logo, config)
  if (config.tipo === 'tipoMerma') return generarTipoMerma(doc, logo, config)
  if (config.tipo === 'orden') return generarOrden(doc, logo, config)
  if (config.tipo === 'alertas') return generarAlertas(doc, logo, config)
}