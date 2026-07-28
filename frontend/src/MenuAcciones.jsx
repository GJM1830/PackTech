import { useState, useRef, useEffect } from 'react'

function MenuAcciones({ onEditar, onDuplicar, onEliminar }) {
  const [abierto, setAbierto] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const cerrarSiClickAfuera = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setAbierto(false)
      }
    }
    document.addEventListener('mousedown', cerrarSiClickAfuera)
    return () => document.removeEventListener('mousedown', cerrarSiClickAfuera)
  }, [])

  return (
    <div className="relative inline-block" ref={menuRef}>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setAbierto(!abierto)
        }}
        className="text-slate-400 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100"
      >
        ⋮
      </button>

      {abierto && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg z-10 overflow-hidden"
        >
          {onEditar && (
            <button
              onClick={() => { setAbierto(false); onEditar() }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Editar
            </button>
          )}
          {onDuplicar && (
            <button
              onClick={() => { setAbierto(false); onDuplicar() }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Duplicar
            </button>
          )}
          {onEliminar && (
            <button
              onClick={() => { setAbierto(false); onEliminar() }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              Eliminar
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default MenuAcciones