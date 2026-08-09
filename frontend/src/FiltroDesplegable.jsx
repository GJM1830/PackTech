import { useState, useRef, useEffect } from 'react'

function FiltroDesplegable({ etiqueta, opciones, seleccionado, onSeleccionar }) {
  const [abierto, setAbierto] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const cerrarSiClickAfuera = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setAbierto(false)
        setBusqueda('')
      }
    }
    document.addEventListener('mousedown', cerrarSiClickAfuera)
    return () => document.removeEventListener('mousedown', cerrarSiClickAfuera)
  }, [])

  const opcionesFiltradas = opciones.filter((op) =>
    op.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAbierto(!abierto)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
          seleccionado
            ? 'bg-slate-900 text-white border-slate-900'
            : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
        }`}
      >
        {seleccionado || etiqueta}
        <span className="text-xs">▾</span>
      </button>

      {abierto && (
        <div className="absolute z-30 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              autoFocus
              placeholder={`Buscar ${etiqueta.toLowerCase()}...`}
              className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm"
            />
          </div>

          <div className="max-h-48 overflow-y-auto">
            <button
              onClick={() => { onSeleccionar(null); setAbierto(false); setBusqueda('') }}
              className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 border-b border-slate-100"
            >
              Todos
            </button>
            {opcionesFiltradas.map((op) => (
              <button
                key={op}
                onClick={() => { onSeleccionar(op); setAbierto(false); setBusqueda('') }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 ${
                  seleccionado === op ? 'bg-slate-100 font-medium text-slate-800' : 'text-slate-600'
                }`}
              >
                {op}
              </button>
            ))}
            {opcionesFiltradas.length === 0 && (
              <p className="px-3 py-2 text-sm text-slate-400">Sin resultados</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default FiltroDesplegable