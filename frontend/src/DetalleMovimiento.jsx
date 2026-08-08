import { useEffect, useState } from 'react'
import axios from './api'

function DetalleMovimiento({ movimiento, orden, onCerrar }) {
  const [tipo, setTipo] = useState('bobina')
  const [detalles, setDetalles] = useState([])
  const [cargando, setCargando] = useState(true)
  const [peso, setPeso] = useState('')
  const [millares, setMillares] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  const cargarDetalles = () => {
    setCargando(true)
    axios.get(`https://packtech-production.up.railway.app/movimientos/${movimiento.id}/detalles`)
      .then((res) => {
        setDetalles(res.data)
        if (res.data.length > 0) setTipo(res.data[0].tipo)
        setCargando(false)
      })
      .catch((err) => {
        console.error(err)
        setCargando(false)
      })
  }

  useEffect(() => {
    cargarDetalles()
  }, [])

  const agregarDetalle = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError(null)

    const siguienteNumero = detalles.length + 1

    try {
      await axios.post(`https://packtech-production.up.railway.app/movimientos/${movimiento.id}/detalles`, {
        tipo,
        numero: siguienteNumero,
        peso: parseFloat(peso),
        millares: parseFloat(millares)
      })
      setPeso('')
      setMillares('')
      cargarDetalles()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al agregar el detalle.')
    } finally {
      setEnviando(false)
    }
  }

  const eliminarDetalle = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return
    try {
      await axios.delete(`https://packtech-production.up.railway.app/movimientos/detalles/${id}`)
      cargarDetalles()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al eliminar.')
    }
  }

  const totalPeso = detalles.reduce((suma, d) => suma + Number(d.peso), 0)
  const totalMillares = detalles.reduce((suma, d) => suma + Number(d.millares), 0)

  const etiqueta = tipo === 'bobina' ? 'Bobina' : 'Fardo'
  const etiquetaPlural = tipo === 'bobina' ? 'Bobinas' : 'Fardos'

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Detalle del Movimiento</h3>
            <p className="text-sm text-slate-500 mt-1">
              {orden?.cliente || 'Cliente desconocido'} · N° Std {orden?.numero_std ?? '-'} · {movimiento.proceso}
            </p>
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-700 text-xl leading-none">
            ×
          </button>
        </div>

        {detalles.length === 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2"
            >
              <option value="bobina">Bobinas</option>
              <option value="fardo">Fardos</option>
            </select>
          </div>
        )}

        <form onSubmit={agregarDetalle} className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-600 mb-1">Peso (kg)</label>
            <input
              type="number"
              step="0.01"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              required
              className="w-full border border-slate-300 rounded px-3 py-2"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-600 mb-1">Millares</label>
            <input
              type="number"
              step="0.01"
              value={millares}
              onChange={(e) => setMillares(e.target.value)}
              required
              className="w-full border border-slate-300 rounded px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={enviando}
              className="bg-slate-900 text-white rounded-lg px-5 py-2 font-medium hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
            >
              {enviando ? 'Agregando...' : `+ ${etiqueta}`}
            </button>
          </div>
        </form>

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        {cargando ? (
          <p className="text-slate-500 text-sm">Cargando...</p>
        ) : (
          <div className="overflow-x-auto bg-slate-50 rounded-lg border border-slate-100">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-2">N°</th>
                  <th className="px-4 py-2">Peso</th>
                  <th className="px-4 py-2">Millares</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {detalles.map((d) => (
                  <tr key={d.id} className="border-t border-slate-200">
                    <td className="px-4 py-2">{d.numero}</td>
                    <td className="px-4 py-2">{d.peso}</td>
                    <td className="px-4 py-2">{d.millares}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => eliminarDetalle(d.id)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {detalles.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-4 py-4 text-center text-slate-400">
                      Sin registros todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {detalles.length > 0 && (
          <div className="mt-4 bg-slate-800 text-white rounded-lg px-4 py-3 flex justify-between text-sm font-medium">
            <span>Total: {detalles.length} {etiquetaPlural.toLowerCase()}</span>
            <span>Peso: {totalPeso.toFixed(2)} kg</span>
            <span>Millares: {totalMillares.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default DetalleMovimiento