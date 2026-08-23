import { useEffect, useState } from 'react'
import axios from './api'
import { esVendedorOMas } from './roles'

const formatearFecha = (fecha) => {
  if (!fecha) return ''
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)}`
}

function FormularioCotizacion({ onCreada }) {
  const [form, setForm] = useState({
    codigo: '',
    ruc: '',
    nombre_cliente: '',
    numero_std: '',
    descripcion: '',
    cantidad: '',
    unidad: 'kg',
    moneda: 'Soles',
    vendedor: '',
    fecha_entrega: '',
    precio_unitario: '',
    unidad_precio: 'kg',
    millares: '',
    direccion_entrega: '',
    numero_contacto: '',
    email_cliente: '',
    telefono_cliente: ''
  })

  const [sugerenciasClientes, setSugerenciasClientes] = useState([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [sugerenciasVendedores, setSugerenciasVendedores] = useState([])

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [exito, setExito] = useState(false)

  const manejarCambio = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  useEffect(() => {
    if (clienteSeleccionado) {
      setSugerenciasClientes([])
      return
    }
    const query = form.ruc.trim() || form.nombre_cliente.trim()
    if (query.length < 2) {
      setSugerenciasClientes([])
      return
    }
    const t = setTimeout(() => {
      axios.get(`https://packtech-production.up.railway.app/clientes/buscar?q=${query}`)
        .then((res) => setSugerenciasClientes(res.data))
        .catch((err) => console.error(err))
    }, 300)
    return () => clearTimeout(t)
  }, [form.ruc, form.nombre_cliente, clienteSeleccionado])

  useEffect(() => {
    if (form.vendedor.trim().length < 2) {
      setSugerenciasVendedores([])
      return
    }
    const t = setTimeout(() => {
      axios.get(`https://packtech-production.up.railway.app/ordenes-produccion/vendedores/buscar?q=${form.vendedor}`)
        .then((res) => setSugerenciasVendedores(res.data))
        .catch((err) => console.error(err))
    }, 300)
    return () => clearTimeout(t)
  }, [form.vendedor])

  const costoEstimado = (() => {
    const precio = parseFloat(form.precio_unitario)
    if (!precio) return null
    const base = form.unidad_precio === 'millares' ? parseFloat(form.millares) : parseFloat(form.cantidad)
    if (!base) return null
    return (precio * base).toFixed(2)
  })()

  const manejarEnvio = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    setExito(false)

    if (form.unidad_precio === 'millares' && !form.millares) {
      setError('Debes indicar los millares si el precio es por millar.')
      setEnviando(false)
      return
    }

    try {
      await axios.post('https://packtech-production.up.railway.app/ordenes-produccion', {
        codigo: form.codigo,
        ruc: form.ruc || null,
        nombre_cliente: form.nombre_cliente,
        numero_std: parseInt(form.numero_std) || 0,
        descripcion: form.descripcion,
        cantidad: parseFloat(form.cantidad),
        unidad: form.unidad,
        estado: 'Preaprobada',
        moneda: form.moneda,
        vendedor: form.vendedor || null,
        fecha_entrega: form.fecha_entrega || null,
        precio_unitario: form.precio_unitario ? parseFloat(form.precio_unitario) : null,
        unidad_precio: form.unidad_precio,
        millares: form.millares ? parseFloat(form.millares) : null,
        direccion_entrega: form.direccion_entrega || null,
        numero_contacto: form.numero_contacto || null,
        email_cliente: form.email_cliente || null,
        telefono_cliente: form.telefono_cliente || null
      })

      setExito(true)
      setForm({
        codigo: '', ruc: '', nombre_cliente: '', numero_std: '', descripcion: '',
        cantidad: '', unidad: 'kg', moneda: 'Soles', vendedor: '', fecha_entrega: '',
        precio_unitario: '', unidad_precio: 'kg', millares: '',
        direccion_entrega: '', numero_contacto: '', email_cliente: '', telefono_cliente: ''
      })
      setClienteSeleccionado(null)
      if (onCreada) onCreada()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear la cotización.')
    } finally {
      setEnviando(false)
    }
  }

  const estilo = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4">Nueva Cotización</h2>

      <form onSubmit={manejarEnvio} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">N° de Pedido</label>
            <input type="text" name="codigo" value={form.codigo} onChange={manejarCambio} required className={estilo} placeholder="OP-118" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">N° Estándar</label>
            <input type="number" name="numero_std" value={form.numero_std} onChange={manejarCambio} className={estilo} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 relative">
          <div className="relative">
            <label className="block text-sm font-medium text-slate-600 mb-1">RUC (opcional)</label>
            <input
              type="text" name="ruc" value={form.ruc}
              onChange={(e) => { manejarCambio(e); setClienteSeleccionado(null) }}
              autoComplete="off" className={estilo} placeholder="20100070970"
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-slate-600 mb-1">Cliente</label>
            <input
              type="text" name="nombre_cliente" value={form.nombre_cliente}
              onChange={(e) => { manejarCambio(e); setClienteSeleccionado(null) }}
              autoComplete="off" required className={estilo} placeholder="Namder"
            />
            {sugerenciasClientes.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {sugerenciasClientes.map((c) => (
                  <button key={c.id} type="button"
                    onClick={() => {
                      setClienteSeleccionado(c)
                      setForm({ ...form, ruc: c.ruc || '', nombre_cliente: c.nombre })
                      setSugerenciasClientes([])
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 border-b border-slate-100 last:border-0"
                  >
                    <span className="font-medium text-slate-800">{c.nombre}</span>
                    {c.ruc && <span className="text-slate-500"> · {c.ruc}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Producto / Descripción</label>
          <input type="text" name="descripcion" value={form.descripcion} onChange={manejarCambio} className={estilo} placeholder="Manga PEBD (bobinas de 50 kg)" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Cantidad</label>
            <input type="number" step="0.01" name="cantidad" value={form.cantidad} onChange={manejarCambio} required className={estilo} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Unidad</label>
            <select name="unidad" value={form.unidad} onChange={manejarCambio} className={estilo}>
              <option value="kg">kg</option>
              <option value="unidades">unidades</option>
              <option value="rollos">rollos</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Moneda</label>
            <select name="moneda" value={form.moneda} onChange={manejarCambio} className={estilo}>
              <option value="Soles">Soles</option>
              <option value="Dólares">Dólares</option>
            </select>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Precio (obligatorio para cotización)</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Precio unitario</label>
              <input type="number" step="0.01" name="precio_unitario" value={form.precio_unitario} onChange={manejarCambio} required className={estilo} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Precio por</label>
              <select name="unidad_precio" value={form.unidad_precio} onChange={manejarCambio} className={estilo}>
                <option value="kg">kg</option>
                <option value="millares">millares</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Millares {form.unidad_precio === 'millares' ? '' : '(opcional)'}
              </label>
              <input
                type="number" step="0.01" name="millares" value={form.millares} onChange={manejarCambio}
                required={form.unidad_precio === 'millares'} className={estilo}
              />
            </div>
          </div>
          {costoEstimado && (
            <p className="text-sm text-slate-600">
              Costo total estimado: <span className="font-bold text-slate-800">{form.moneda === 'Dólares' ? '$' : 'S/'} {costoEstimado}</span>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 relative">
          <div className="relative">
            <label className="block text-sm font-medium text-slate-600 mb-1">Vendedor</label>
            <input
              type="text" name="vendedor" value={form.vendedor} onChange={manejarCambio}
              autoComplete="off" required className={estilo}
            />
            {sugerenciasVendedores.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {sugerenciasVendedores.map((v) => (
                  <button key={v.id} type="button"
                    onClick={() => { setForm({ ...form, vendedor: v.nombre }); setSugerenciasVendedores([]) }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                  >
                    {v.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Fecha de entrega</label>
            <input type="date" name="fecha_entrega" value={form.fecha_entrega} onChange={manejarCambio} required className={estilo} />
          </div>
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer text-slate-500 hover:text-slate-700 font-medium">
            + Datos opcionales (dirección, contacto)
          </summary>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Dirección de entrega</label>
              <input type="text" name="direccion_entrega" value={form.direccion_entrega} onChange={manejarCambio} className={estilo} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">N° de contacto</label>
              <input type="text" name="numero_contacto" value={form.numero_contacto} onChange={manejarCambio} className={estilo} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Email del cliente</label>
              <input type="email" name="email_cliente" value={form.email_cliente} onChange={manejarCambio} className={estilo} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Teléfono del cliente</label>
              <input type="text" name="telefono_cliente" value={form.telefono_cliente} onChange={manejarCambio} className={estilo} />
            </div>
          </div>
        </details>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {exito && <p className="text-green-700 text-sm font-medium">Cotización creada correctamente.</p>}

        <button type="submit" disabled={enviando} className="w-full bg-blue-700 text-white rounded-lg py-2.5 font-medium hover:bg-blue-800 disabled:opacity-50">
          {enviando ? 'Creando...' : 'Crear Cotización'}
        </button>
      </form>
    </div>
  )
}

function Cotizaciones() {
  const [ordenes, setOrdenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [aprobando, setAprobando] = useState(null)
  const vendedorOAdmin = esVendedorOMas()

  const cargar = () => {
    setCargando(true)
    axios.get('https://packtech-production.up.railway.app/ordenes-produccion/preaprobadas/listar')
      .then((res) => {
        setOrdenes(res.data)
        setError(null)
      })
      .catch((err) => {
        console.error(err)
        setError('No se pudo conectar con el backend.')
      })
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargar()
  }, [])

  const aprobar = async (id) => {
    if (!confirm('¿Aprobar esta cotización y enviarla a producción?')) return
    setAprobando(id)
    try {
      await axios.post(`https://packtech-production.up.railway.app/ordenes-produccion/${id}/aprobar`)
      cargar()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al aprobar la cotización.')
    } finally {
      setAprobando(null)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cotizaciones</h1>
        <p className="text-slate-500 text-sm mt-1">
          {vendedorOAdmin
            ? 'Crea cotizaciones y apruébalas para enviarlas a producción.'
            : 'Seguimiento de cotizaciones pendientes de aprobación.'}
        </p>
      </div>

      {vendedorOAdmin && <FormularioCotizacion onCreada={cargar} />}

      <div>
        {cargando && <p className="text-slate-500">Cargando...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!cargando && !error && (
          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">N° Pedido</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">Cantidad</th>
                  <th className="px-4 py-3">Fecha entrega</th>
                  {vendedorOAdmin && <th className="px-4 py-3">Precio</th>}
                  {vendedorOAdmin && <th className="px-4 py-3">Total</th>}
                  <th className="px-4 py-3">Vendedor</th>
                  {vendedorOAdmin && <th className="px-4 py-3 text-right"></th>}
                </tr>
              </thead>
              <tbody>
                {ordenes.map((o) => (
                  <tr key={o.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">{o.codigo}</td>
                    <td className="px-4 py-3">{o.cliente}</td>
                    <td className="px-4 py-3">{o.descripcion}</td>
                    <td className="px-4 py-3">{o.cantidad} {o.unidad}</td>
                    <td className="px-4 py-3">{formatearFecha(o.fecha_entrega)}</td>
                    {vendedorOAdmin && (
                      <td className="px-4 py-3">
                        {o.precio_unitario ? `${o.moneda === 'Dólares' ? '$' : 'S/'} ${o.precio_unitario} / ${o.unidad_precio}` : '—'}
                      </td>
                    )}
                    {vendedorOAdmin && (
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {o.costo_total ? `${o.moneda === 'Dólares' ? '$' : 'S/'} ${o.costo_total}` : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3">{o.vendedor || '—'}</td>
                    {vendedorOAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => aprobar(o.id)}
                          disabled={aprobando === o.id}
                          className="bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-green-800 disabled:opacity-50"
                        >
                          {aprobando === o.id ? 'Aprobando...' : '✓ Aprobar'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {ordenes.length === 0 && (
                  <tr>
                    <td colSpan={vendedorOAdmin ? 9 : 6} className="px-4 py-6 text-center text-slate-400">
                      No hay cotizaciones pendientes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Cotizaciones