// Utilidades compartidas para filtros de periodo rápido y persistencia
// entre pestañas / recargas de página (localStorage).

const pad2 = (n) => String(n).padStart(2, '0')
export const aISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

const inicioSemana = (base = new Date()) => {
  const d = new Date(base)
  const dia = d.getDay() // 0=domingo ... 6=sábado
  const diff = dia === 0 ? 6 : dia - 1
  d.setDate(d.getDate() - diff)
  return d
}
const sumarDias = (d, n) => {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

// Mismos criterios de calendario que usa Reportes.jsx (lunes a domingo,
// mes calendario, año calendario) — no ventanas rodantes.
export const PERIODOS_RAPIDOS = [
  { id: 'todo', label: 'Todo', desde: () => '', hasta: () => '' },
  { id: 'dia', label: 'Hoy', desde: () => aISO(new Date()), hasta: () => aISO(new Date()) },
  {
    id: 'semana', label: 'Esta semana',
    desde: () => aISO(inicioSemana()),
    hasta: () => aISO(sumarDias(inicioSemana(), 6))
  },
  {
    id: 'mes', label: 'Este mes',
    desde: () => { const d = new Date(); return aISO(new Date(d.getFullYear(), d.getMonth(), 1)) },
    hasta: () => { const d = new Date(); return aISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }
  },
  {
    id: 'anio', label: 'Este año',
    desde: () => { const d = new Date(); return aISO(new Date(d.getFullYear(), 0, 1)) },
    hasta: () => { const d = new Date(); return aISO(new Date(d.getFullYear(), 11, 31)) }
  }
]

export function cargarFiltros(clave, valoresPorDefecto) {
  try {
    const guardado = localStorage.getItem(clave)
    if (!guardado) return valoresPorDefecto
    return { ...valoresPorDefecto, ...JSON.parse(guardado) }
  } catch {
    return valoresPorDefecto
  }
}

export function guardarFiltros(clave, valores) {
  try {
    localStorage.setItem(clave, JSON.stringify(valores))
  } catch {
    // localStorage no disponible (modo privado, etc.) — se ignora, no es crítico
  }
}