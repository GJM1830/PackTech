import { useState } from 'react'
import axios from './api'

function CrearOrden({ onCreada }) {
  const [form, setForm] = useState({
    codigo: '',
    cliente_id: '',
    numero_std: '',
    cantidad: '',
    unidad: 'kg',
    estado: 'Pendiente'
  })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [exito, setExito] = useState(false)

  const manejarCambio = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const manejarEnvio = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    setExito(false)

    try {
      await axios.post('https://packtech-production.up.railway.app/ordenes-produccion', {
        codigo: form.codigo,
        cliente_id: parseInt(form.cliente_id),
        numero_std: parseInt(form.numero_std),
        cantidad: parseFloat(form.cantidad),
        unidad: form.unidad,
        estado: form.estado
      })

      setExito(true)
      setForm({
        codigo: '',
        cliente_id: '',
        numero_std: '',
        cantidad: '',
        unidad: 'kg',
        estado: 'Pendiente'
      })

      if (onCreada) onCreada()
    } catch (err) {
      const mensaje = err.response?.data?.detail || 'Error al crear la orden.'
      setError(mensaje)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4">
        Nueva Orden de Producción
      </h2>

      <form onSubmit={manejarEnvio} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Código
          </label>
          <input
            type="text"
            name="codigo"
            value={form.codigo}
            onChange={manejarCambio}
            required
            className="w-full border border-slate-300 rounded px-3 py-2"
            placeholder="OP-002"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            ID Cliente
          </label>
          <input
            type="number"
            name="cliente_id"
            value={form.cliente_id}
            onChange={manejarCambio}
            required
            className="w-full border border-slate-300 rounded px-3 py-2"
            placeholder="1"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Número Estándar
          </label>
          <input
            type="number"
            name="numero_std"
            value={form.numero_std}
            onChange={manejarCambio}
            required
            className="w-full border border-slate-300 rounded px-3 py-2"
          />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Cantidad
            </label>
            <input
              type="number"
              step="0.01"
              name="cantidad"
              value={form.cantidad}
              onChange={manejarCambio}
              required
              className="w-full border border-slate-300 rounded px-3 py-2"
            />
          </div>

          <div className="w-32">
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Unidad
            </label>
            <select
              name="unidad"
              value={form.unidad}
              onChange={manejarCambio}
              className="w-full border border-slate-300 rounded px-3 py-2"
            >
              <option value="kg">kg</option>
              <option value="unidades">unidades</option>
              <option value="rollos">rollos</option>
            </select>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {exito && <p className="text-green-600 text-sm">Orden creada correctamente.</p>}

        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-slate-900 text-white rounded-lg py-2.5 font-medium hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {enviando ? 'Creando...' : 'Crear Orden'}
        </button>
      </form>
    </div>
  )
}

export default CrearOrden