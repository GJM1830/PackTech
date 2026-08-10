import { useState, useEffect } from 'react'
import axios from './api'

function CrearOrden({ onCreada, duplicarDesde }) {
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

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [exito, setExito] = useState(false)

  const [sugerenciasClientes, setSugerenciasClientes] = useState([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)

  const manejarCambio = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

useEffect(() => {
  if (duplicarDesde) {
    setForm({
      codigo: '',
      ruc: duplicarDesde.ruc,
      nombre_cliente: duplicarDesde.cliente,
      numero_std: duplicarDesde.numero_std,
      descripcion: duplicarDesde.descripcion || '',
      cantidad: duplicarDesde.cantidad,
      unidad: duplicarDesde.unidad,
      estado: 'Pendiente'
    })
    setClienteSeleccionado({ ruc: duplicarDesde.ruc, nombre: duplicarDesde.cliente })
  }
}, [duplicarDesde])

  useEffect(() => {
    if (form.ruc.trim().length < 4 || clienteSeleccionado) {
      setSugerenciasClientes([])
      return
    }

    const temporizador = setTimeout(() => {
      axios.get(`https://packtech-production.up.railway.app/clientes/buscar?q=${form.ruc}`)
        .then((res) => setSugerenciasClientes(res.data))
        .catch((err) => console.error(err))
    }, 300)

    return () => clearTimeout(temporizador)
  }, [form.ruc, clienteSeleccionado])

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

      setClienteSeleccionado(null)

      if (onCreada) onCreada()

    } catch (err) {
      if (err.response) {
        setError(err.response.data?.detail || 'Error al crear la orden.')
      } else {
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
        setClienteSeleccionado(null)
        if (onCreada) onCreada()
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-5">
        Registrar Orden de Producción
      </h2>

      <form onSubmit={manejarEnvio} className="space-y-4">

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Número de Pedido
          </label>

          <input
            type="text"
            name="codigo"
            value={form.codigo}
            onChange={manejarCambio}
            required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600"
            placeholder="OP-002"
          />
        </div>

        <div className="relative">
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
              setClienteSeleccionado(null)
            }}
            required
            autoComplete="off"
            className="w-full border border-slate-300 rounded px-3 py-2"
            placeholder="20100070970"
          />

          {sugerenciasClientes.length > 0 && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {sugerenciasClientes.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setClienteSeleccionado(c)
                    setForm({ ...form, ruc: c.ruc, nombre_cliente: c.nombre })
                    setSugerenciasClientes([])
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 border-b border-slate-100 last:border-0"
                >
                  <span className="font-medium text-slate-800">{c.ruc}</span>
                  <span className="text-slate-400"> · {c.nombre}</span>
                </button>
              ))}
            </div>
          )}
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
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600"
            placeholder="Se autocompleta si el RUC existe, o escríbelo si es nuevo"
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
            Producto / Descripción
          </label>

          <input
            type="text"
            name="descripcion"
            value={form.descripcion}
            onChange={manejarCambio}
            className="w-full border border-slate-300 rounded px-3 py-2"
            placeholder="Hielo PackTech / Bolsa camiseta blanca 18x30 "
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
          className="w-full bg-blue-700 text-white rounded-lg py-2.5 font-medium hover:bg-blue-800 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {enviando ? 'Creando...' : 'Registrar Orden'}
        </button>

      </form>
    </div>
  )
}

export default CrearOrden