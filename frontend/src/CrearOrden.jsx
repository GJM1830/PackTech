import { useState } from 'react'
import axios from './api'

function CrearOrden({ onCreada }) {
  const [form, setForm] = useState({
    codigo: '',
    ruc: '',
    nombre_cliente: '',
    numero_std: '',
    descripcion: '',
    cantidad: '',
    unidad: 'kg',
    estado: 'Pendiente'
  })

  const [clienteExiste, setClienteExiste] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [exito, setExito] = useState(false)

  const manejarCambio = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  const buscarCliente = async (ruc) => {
    if (ruc.length !== 11) {
      setClienteExiste(false)
      return
    }

    try {
      const res = await axios.get(`/clientes/${ruc}`)

      setForm((prev) => ({
        ...prev,
        ruc,
        nombre_cliente: res.data.nombre
      }))

      setClienteExiste(true)
    } catch {
      setClienteExiste(false)

      setForm((prev) => ({
        ...prev,
        ruc,
        nombre_cliente: ''
      }))
    }
  }

  const manejarEnvio = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    setExito(false)

    try {
      await axios.post('/ordenes-produccion', {
      codigo: form.codigo,
      ruc: form.ruc,
      nombre_cliente: form.nombre_cliente,
      numero_std: parseInt(form.numero_std),
      descripcion: form.descripcion,
      cantidad: parseFloat(form.cantidad),
      unidad: form.unidad,
      estado: form.estado
    })

      setExito(true)

      setForm({
        codigo: '',
        ruc: '',
        nombre_cliente: '',
        numero_std: '',
        descripcion: '',
        cantidad: '',
        unidad: 'kg',
        estado: 'Pendiente'
      })

      setClienteExiste(false)

      if (onCreada) onCreada()

    } catch (err) {
      const mensaje =
        err.response?.data?.detail || 'Error al crear la orden.'

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
            RUC
          </label>

          <input
          type="text"
          name="ruc"
          value={form.ruc}
          maxLength={11}
          onChange={(e) => {
            manejarCambio(e)
            buscarCliente(e.target.value)
          }}
          className="w-full border rounded px-3 py-2"
            required
            className="w-full border border-slate-300 rounded px-3 py-2"
            placeholder="20100070970"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Cliente
          </label>

          <input
            type="text"
            name="nombre_cliente"
            value={form.nombre_cliente}
            onChange={manejarCambio}
            className="w-full border rounded px-3 py-2"
            placeholder="Se autocompleta si el RUC existe"
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

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Descripción
          </label>

          <input
            type="text"
            name="descripcion"
            value={form.descripcion}
            onChange={manejarCambio}
            className="w-full border border-slate-300 rounded px-3 py-2"
            placeholder="Bolsa camiseta blanca 18x30"
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

        {error && (
          <p className="text-red-600 text-sm">{error}</p>
        )}

        {exito && (
          <p className="text-green-600 text-sm">
            Orden creada correctamente.
          </p>
        )}

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

const buscarCliente = async (ruc) => {
  if (ruc.length !== 11) return

  try {
    const res = await axios.get(`/clientes/ruc/${ruc}`)

    if (res.data) {
      setForm(f => ({
        ...f,
        ruc,
        nombre_cliente: res.data.nombre
      }))
    }
  } catch {
    setForm(f => ({
      ...f,
      ruc,
      nombre_cliente: ''
    }))
  }
}