// Utilidades comunes para blindar los generadores de PDF: evitan que un texto
// largo se salga de su celda o de la hoja, y protegen contra datos faltantes
// o inválidos (null, undefined, NaN) sin romper la generación del PDF.

// Nunca deja que un valor nulo/vacío rompa un texto: siempre un string seguro.
export function textoSeguro(valor, porDefecto = '-') {
  if (valor === null || valor === undefined) return porDefecto
  const texto = String(valor).trim()
  return texto.length > 0 ? texto : porDefecto
}

// Envuelve doc.splitTextToSize en un try/catch: si algo falla, devuelve una
// sola línea en vez de tumbar el PDF completo.
export function medirLineas(doc, texto, anchoMax) {
  try {
    const lineas = doc.splitTextToSize(textoSeguro(texto), Math.max(anchoMax, 5))
    return lineas.length > 0 ? lineas : ['-']
  } catch {
    return [textoSeguro(texto)]
  }
}

// Alto necesario para una fila donde varias columnas pueden tener distinto
// número de líneas (ej. descripción larga vs. precio corto) — evita que una
// columna se salga del recuadro de la fila mientras otra se queda corta.
export function alturaFilaMultilinea(listasDeLineas, altoLinea, alturaMinima, paddingExtra = 4.5) {
  const maxLineas = Math.max(1, ...listasDeLineas.map((l) => l.length))
  return Math.max(alturaMinima, maxLineas * altoLinea + paddingExtra)
}

// Si lo que se va a dibujar no cabe antes de limiteInferior, agrega una
// página nueva y devuelve el nuevo Y. Para bloques SIN cabecera repetida
// (tablas con autoTable o encabezados propios, usar el patrón manual).
export function asegurarEspacio(doc, y, alturaNecesaria, limiteInferior = 270, yInicioPagina = 16) {
  if (y + alturaNecesaria > limiteInferior) {
    doc.addPage()
    return yInicioPagina
  }
  return y
}

// Formatea un monto de forma segura: nunca lanza error por null/NaN/texto raro.
export function montoSeguro(valor, simbolo = '') {
  const n = Number(valor)
  if (!isFinite(n)) return '-'
  return `${simbolo ? simbolo + ' ' : ''}${n.toFixed(2)}`
}