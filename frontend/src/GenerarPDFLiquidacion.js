import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const formatearFecha = (fecha) => {
  if (!fecha) return '-'
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)}`
}

export async function generarPDFLiquidacion(data) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const M = 12
  const ANCHO = 210 - M * 2
  const azul = [30, 64, 175]
  const slate900 = [15, 23, 42]
  const slate600 = [71, 85, 105]

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

  let y = 14
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

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...slate900)
  doc.text('LIQUIDACIÓN DE PRODUCCIÓN', M + ANCHO, y + 6, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...slate600)
  doc.text(`Pedido ${data.codigo}  ·  ${formatearFecha(data.fecha)}`, M + ANCHO, y + 12, { align: 'right' })

  y += 24

  doc.setFontSize(9)
  doc.setTextColor(...slate600)
  doc.text(`Cliente: ${data.cliente}${data.ruc ? '  ·  RUC/DNI: ' + data.ruc : ''}`, M, y)
  y += 5
  doc.text(`Producto: ${data.descripcion || '-'}  ·  Cantidad planificada: ${data.cantidad} ${data.unidad}`, M, y)
  y += 8

  if (data.materiales_extrusion.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...slate900)
    doc.text('Materiales usados en Extrusión', M, y)
    y += 3
    autoTable(doc, {
      startY: y,
      head: [['Material', 'Cantidad (kg)']],
      body: data.materiales_extrusion.map((m) => [m.tipo_material || '-', m.cantidad.toFixed(2)]),
      theme: 'grid',
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: M, right: M }
    })
    y = doc.lastAutoTable.finalY + 8
  }

  data.procesos.forEach((p) => {
    if (y > 250) {
      doc.addPage()
      y = 16
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...slate900)
    doc.text(`${p.proceso}  ·  ${p.maquina || 'Sin máquina'}  ·  ${p.operario}`, M, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...slate600)
    doc.text(`${formatearFecha(p.fecha)}  ${p.hora?.slice(0, 5) || ''}`, M + ANCHO, y, { align: 'right' })
    y += 5

    if (p.bobinas_salida.length > 0) {
      const esSellado = p.proceso === 'Sellado'
      const hayMaterial = !esSellado && p.bobinas_salida.some((b) => b.tipo_material)

      const cabecera = esSellado
        ? ['N°', 'Neto', 'Millares']
        : ['N°', 'Bruto', 'Tuco', 'Neto']
      if (hayMaterial) cabecera.push('Material')

      autoTable(doc, {
        startY: y,
        head: [cabecera],
        body: p.bobinas_salida.map((b) => {
          if (esSellado) {
            return [b.numero, b.peso_neto.toFixed(2), b.millares != null ? b.millares : '-']
          }
          const fila = [b.numero, b.peso_bruto.toFixed(2), (b.peso_tuco || 0).toFixed(2), b.peso_neto.toFixed(2)]
          if (hayMaterial) fila.push(b.tipo_material || '-')
          return fila
        }),
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5 },
        margin: { left: M, right: M }
      })
      y = doc.lastAutoTable.finalY + 3
    } else {
      doc.setFontSize(8)
      doc.setTextColor(...slate600)
      doc.text(`Entrada: ${p.entrada} ${p.unidad}   Salida: ${p.salida} ${p.unidad}`, M, y)
      y += 6
    }

    if (p.mermas.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [['Merma (kg)', 'Tipo']],
        body: p.mermas.map((m) => [m.peso.toFixed(2), m.tipo_merma || 'Sin especificar']),
        theme: 'grid',
        headStyles: { fillColor: [153, 27, 27], textColor: 255, fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5 },
        margin: { left: M, right: M },
        tableWidth: 90
      })
      y = doc.lastAutoTable.finalY + 3
    }

    if (p.observacion) {
      doc.setFontSize(7.5)
      doc.setTextColor(...slate600)
      doc.text(`Obs: ${p.observacion}`, M, y)
      y += 5
    }

    y += 5
  })

  const ultimoProceso = data.procesos[data.procesos.length - 1]
  if (ultimoProceso && ultimoProceso.proceso === 'Sellado') {
    if (y > 260) {
      doc.addPage()
      y = 16
    }

    const mermaTotalGeneral = data.procesos.reduce(
      (s, p) => s + p.mermas.reduce((s2, m) => s2 + m.peso, 0),
      0
    )
    const kgTotalFinal = ultimoProceso.bobinas_salida.reduce((s, b) => s + b.peso_neto, 0)
    const millaresTotalFinal = ultimoProceso.bobinas_salida.reduce((s, b) => s + (b.millares || 0), 0)

    const anchoResumen = ANCHO
    const alturaResumen = 22

    doc.setFillColor(15, 23, 42)
    doc.rect(M, y, anchoResumen, alturaResumen, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text('RESUMEN FINAL DE LIQUIDACIÓN', M + 4, y + 6)

    const anchoTercio = (anchoResumen - 8) / 3
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(`Merma total: ${mermaTotalGeneral.toFixed(2)} kg`, M + 4, y + 15)
    doc.text(`Kg totales (Sellado): ${kgTotalFinal.toFixed(2)} kg`, M + 4 + anchoTercio, y + 15)
    doc.text(`Millares totales: ${millaresTotalFinal.toFixed(2)}`, M + 4 + anchoTercio * 2, y + 15)

    y += alturaResumen + 5
  }

  doc.save(`Liquidacion_${data.codigo}.pdf`)
}