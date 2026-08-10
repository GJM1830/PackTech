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

      setClienteSeleccionado({
        ruc: duplicarDesde.ruc,
        nombre: duplicarDesde.cliente
      })
    }
  }, [duplicarDesde])

  useEffect(() => {
    if (form.ruc.trim().length < 4 || clienteSeleccionado) {
      setSugerenciasClientes([])
      return
    }

    const temporizador = setTimeout(() => {
      axios.get(
        `https://packtech-production.up.railway.app/clientes/buscar?q=${form.ruc}`
      )
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

  const estiloInput =
    "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-600 transition"

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6">

      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">
          Registrar Orden de Producción
        </h2>
      </div>

      <form onSubmit={manejarEnvio} className="space-y-5">

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            Número de Pedido
          </label>

          <input
            type="text"
            name="codigo"
            value={form.codigo}
            onChange={manejarCambio}
            required
            className={estiloInput}
            placeholder="OP-002"
          />
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
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
            className={estiloInput}
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
                    setForm({
                      ...form,
                      ruc: c.ruc,
                      nombre_cliente: c.nombre
                    })
                    setSugerenciasClientes([])
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 border-b border-slate-100 last:border-0 transition"
                >
                  <span className="font-medium text-slate-800">
                    {c.ruc}
                  </span>

                  <span className="text-slate-500">
                    {' · '}{c.nombre}
                  </span>
                </button>
              ))}

            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            Cliente
          </label>

          <input
            type="text"
            name="nombre_cliente"
            value={form.nombre_cliente}
            onChange={manejarCambio}
            className={estiloInput}
            placeholder="Se autocompleta si el RUC existe, o escríbelo si es nuevo"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            Número Estándar
          </label>

          <input
            type="number"
            name="numero_std"
            value={form.numero_std}
            onChange={manejarCambio}
            required
            className={estiloInput}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">
            Producto / Descripción
          </label>

          <input
            type="text"
            name="descripcion"
            value={form.descripcion}
            onChange={manejarCambio}
            className={estiloInput}
            placeholder="Hielo PackTech / Bolsa camiseta blanca 18x30"
          />
        </div>

        <div className="flex gap-4">

          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              Cantidad
            </label>

            <input
              type="number"
              step="0.01"
              name="cantidad"
              value={form.cantidad}
              onChange={manejarCambio}
              required
              className={estiloInput}
            />
          </div>

          <div className="w-32">
            <label className="block text-sm font-medium text-slate-600 mb-1.5">
              Unidad
            </label>

            <select
              name="unidad"
              value={form.unidad}
              onChange={manejarCambio}
              className={estiloInput}
            >
              <option value="kg">kg</option>
              <option value="unidades">unidades</option>
              <option value="rollos">rollos</option>
            </select>
          </div>

        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 text-sm">
            {error}
          </div>
        )}

        {exito && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2.5 text-sm font-medium">
            Orden creada correctamente.
          </div>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-blue-700 text-white rounded-lg py-2.5 font-medium hover:bg-blue-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {enviando ? 'Registrando...' : 'Registrar Orden'}
        </button>

      </form>
    </div>
  )
}

export default CrearOrden