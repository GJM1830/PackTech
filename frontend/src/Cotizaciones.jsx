import { useEffect, useState } from 'react'
import axios from './api'
import { esVendedorOMas } from './roles'
import MenuAcciones from './MenuAcciones'
import ModalEditar from './ModalEditar'
import VistaCotizacion from './VistaCotizacion'
import FiltroDesplegable from './FiltroDesplegable'

const formatearFecha = (fecha) => {
  if (!fecha) return ''
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)}`
}

function FormularioCotizacion({ onCreada, duplicarDesde }) {
  const TODOS_LOS_PROCESOS = ['Extrusión', 'Laminado', 'Impresión', 'Sellado', 'Corte', 'Almacén', 'Despacho']

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
    telefono_cliente: '',
    tipo_trabajo: ''
  })

  const [procesosRuta, setProcesosRuta] = useState([])

  const agregarProceso = (proceso) => {
    setProcesosRuta((actual) => [...actual, proceso])
  }

  const quitarProceso = (index) => {
    setProcesosRuta((actual) => actual.filter((_, i) => i !== index))
  }

  const moverProceso = (index, direccion) => {
    setProcesosRuta((actual) => {
      const nuevo = [...actual]
      const destino = index + direccion
      if (destino < 0 || destino >= nuevo.length) return actual
      ;[nuevo[index], nuevo[destino]] = [nuevo[destino], nuevo[index]]
      return nuevo
    })
  }

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
    if (duplicarDesde) {
      setForm({
        codigo: '',
        ruc: duplicarDesde.ruc || '',
        nombre_cliente: duplicarDesde.cliente || '',
        numero_std: duplicarDesde.numero_std || '',
        descripcion: duplicarDesde.descripcion || '',
        cantidad: duplicarDesde.cantidad || '',
        unidad: duplicarDesde.unidad || 'kg',
        moneda: duplicarDesde.moneda || 'Soles',
        vendedor: duplicarDesde.vendedor || '',
        fecha_entrega: '',
        precio_unitario: duplicarDesde.precio_unitario || '',
        unidad_precio: duplicarDesde.unidad_precio || 'kg',
        millares: duplicarDesde.millares || '',
        direccion_entrega: duplicarDesde.direccion_entrega || '',
        numero_contacto: duplicarDesde.numero_contacto || '',
        email_cliente: duplicarDesde.email_cliente || '',
        telefono_cliente: duplicarDesde.telefono_cliente || ''
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [duplicarDesde])

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
        telefono_cliente: form.telefono_cliente || null,
        tipo_trabajo: form.tipo_trabajo || null,
        procesos_plan: procesosRuta.length > 0 ? procesosRuta.join(',') : null
      })

      setExito(true)
      setForm({
        codigo: '', ruc: '', nombre_cliente: '', numero_std: '', descripcion: '',
        cantidad: '', unidad: 'kg', moneda: 'Soles', vendedor: '', fecha_entrega: '',
        precio_unitario: '', unidad_precio: 'kg', millares: '',
        direccion_entrega: '', numero_contacto: '', email_cliente: '', telefono_cliente: '',
        tipo_trabajo: ''
      })
      setProcesosRuta([])
      setClienteSeleccionado(null)
      if (onCreada) onCreada()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear la Pedido.')
    } finally {
      setEnviando(false)
    }
  }

  const estilo = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-4">Nuevo Pedido</h2>

      <form onSubmit={manejarEnvio} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">N° de Pedido</label>
            <input type="text" name="codigo" value={form.codigo} onChange={manejarCambio} required className={estilo} placeholder="OP-118" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">N° Estándar</label>
            <input type="number" name="numero_std" value={form.numero_std} onChange={manejarCambio} className={estilo} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
          <div className="relative">
            <label className="block text-sm font-medium text-slate-600 mb-1">RUC (opcional)</label>
            <input
              type="text" name="ruc" value={form.ruc} maxLength={11}
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Precio (obligatorio para Pedido)</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
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

        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Tipo de trabajo y ruta (opcional)</p>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Tipo de trabajo</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, tipo_trabajo: form.tipo_trabajo === 'Venta' ? '' : 'Venta' })}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  form.tipo_trabajo === 'Venta' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                }`}
              >
                Venta
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, tipo_trabajo: form.tipo_trabajo === 'Servicio' ? '' : 'Servicio' })}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  form.tipo_trabajo === 'Servicio' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                }`}
              >
                Servicio
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Ruta de procesos</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {TODOS_LOS_PROCESOS.filter((p) => !procesosRuta.includes(p)).map((proceso) => (
                <button
                  key={proceso}
                  type="button"
                  onClick={() => agregarProceso(proceso)}
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-white text-slate-600 border border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                >
                  + {proceso}
                </button>
              ))}
            </div>
            {procesosRuta.length > 0 && (
              <div className="space-y-1.5">
                {procesosRuta.map((proceso, index) => (
                  <div key={`${proceso}-${index}`} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                    <span className="text-xs font-bold text-blue-700 bg-white rounded-full w-5 h-5 flex items-center justify-center border border-blue-300">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium text-blue-800">{proceso}</span>
                    <button type="button" onClick={() => moverProceso(index, -1)} disabled={index === 0} className="text-blue-600 hover:text-blue-800 disabled:opacity-30 px-1">↑</button>
                    <button type="button" onClick={() => moverProceso(index, 1)} disabled={index === procesosRuta.length - 1} className="text-blue-600 hover:text-blue-800 disabled:opacity-30 px-1">↓</button>
                    <button type="button" onClick={() => quitarProceso(index)} className="text-red-500 hover:text-red-700 px-1">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <details className="text-sm">
          <summary className="cursor-pointer text-slate-500 hover:text-slate-700 font-medium">
            + Datos opcionales (dirección, contacto)
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        {exito && <p className="text-green-700 text-sm font-medium">Pedido creada correctamente.</p>}

        <button type="submit" disabled={enviando} className="w-full bg-green-700 text-white rounded-lg py-2.5 font-medium hover:bg-green-800 disabled:opacity-50">
          {enviando ? 'Creando...' : 'Registrar Pedido'}
        </button>
      </form>
    </div>
  )
}

function VistaSeguimiento() {
  const [ordenes, setOrdenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [filtroCodigo, setFiltroCodigo] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroEstado, setFiltroEstado] = useState(null)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [vistaAbierta, setVistaAbierta] = useState(null)

  const cargar = () => {
    setCargando(true)
    axios.get('https://packtech-production.up.railway.app/ordenes-produccion/seguimiento/listar')
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

  const formatearFecha = (fecha) => {
    if (!fecha) return '—'
    const [anio, mes, dia] = fecha.split('-')
    return `${dia}/${mes}/${anio.slice(2)}`
  }

  const diasParaEntrega = (fechaEntrega) => {
    if (!fechaEntrega) return null
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const entrega = new Date(fechaEntrega + 'T00:00:00')
    return Math.round((entrega - hoy) / (1000 * 60 * 60 * 24))
  }

  const estiloUrgencia = (orden) => {
    if (orden.estado === 'Terminado') {
      return 'border-green-200 bg-green-50'
    }
    const dias = diasParaEntrega(orden.fecha_entrega)
    if (dias === null) return 'border-slate-200 bg-white'
    if (dias < 0) return 'border-red-300 bg-red-50'
    if (dias <= 3) return 'border-amber-300 bg-amber-50'
    return 'border-slate-200 bg-white'
  }

  const etiquetaUrgencia = (orden) => {
    if (orden.estado === 'Terminado') return null
    const dias = diasParaEntrega(orden.fecha_entrega)
    if (dias === null) return null
    if (dias < 0) return { texto: `Vencido (${Math.abs(dias)}d)`, color: 'text-red-700' }
    if (dias === 0) return { texto: 'Entrega hoy', color: 'text-amber-700' }
    if (dias <= 3) return { texto: `Faltan ${dias}d`, color: 'text-amber-700' }
    return { texto: `Faltan ${dias}d`, color: 'text-slate-500' }
  }

  const estadosUnicos = [...new Set(ordenes.map(o => o.estado))].sort()

  const ordenesFiltradas = ordenes.filter((o) => {
    if (filtroCodigo && !o.codigo.toLowerCase().includes(filtroCodigo.toLowerCase())) return false
    if (filtroCliente && !(o.cliente || '').toLowerCase().includes(filtroCliente.toLowerCase())) return false
    if (filtroEstado && o.estado !== filtroEstado) return false
    if (fechaDesde && (!o.fecha_entrega || o.fecha_entrega < fechaDesde)) return false
    if (fechaHasta && (!o.fecha_entrega || o.fecha_entrega > fechaHasta)) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={filtroCodigo}
          onChange={(e) => setFiltroCodigo(e.target.value)}
          placeholder="Buscar N° Pedido..."
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-40"
        />
        <input
          type="text"
          value={filtroCliente}
          onChange={(e) => setFiltroCliente(e.target.value)}
          placeholder="Buscar Cliente..."
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-40"
        />
        <FiltroDesplegable
          etiqueta="Estado"
          opciones={estadosUnicos}
          seleccionado={filtroEstado}
          onSeleccionar={setFiltroEstado}
        />
        <div className="flex items-center gap-1.5 text-sm text-slate-500">
          <span>Entrega desde</span>
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
          />
          <span>hasta</span>
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
          />
        </div>
        {(filtroCodigo || filtroCliente || filtroEstado || fechaDesde || fechaHasta) && (
          <button
            onClick={() => { setFiltroCodigo(''); setFiltroCliente(''); setFiltroEstado(null); setFechaDesde(''); setFechaHasta('') }}
            className="text-sm text-slate-400 hover:text-slate-700 underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {cargando && <p className="text-slate-500">Cargando...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!cargando && !error && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ordenesFiltradas.map((o) => {
            const urgencia = etiquetaUrgencia(o)
            return (
              <div
                key={o.id}
                onClick={() => setVistaAbierta(o)}
                className={`rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-shadow ${estiloUrgencia(o)}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-slate-800">{o.codigo}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    o.estado === 'Terminado' ? 'bg-green-100 text-green-700' :
                    o.estado === 'En almacén' ? 'bg-blue-100 text-blue-700' :
                    o.estado === 'En proceso' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {o.estado}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-1">{o.cliente}</p>
                {o.descripcion && <p className="text-xs text-slate-400 mb-3">{o.descripcion}</p>}
                <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-200">
                  <span className="text-slate-500">Proceso: <span className="font-medium text-slate-700">{o.ultimo_proceso}</span></span>
                  <span className="text-slate-500">Entrega: <span className="font-medium text-slate-700">{formatearFecha(o.fecha_entrega)}</span></span>
                </div>
                {urgencia && (
                  <p className={`text-xs font-semibold mt-1 ${urgencia.color}`}>{urgencia.texto}</p>
                )}
              </div>
            )
          })}
          {ordenesFiltradas.length === 0 && (
            <p className="text-slate-400 col-span-full text-center py-8">No hay pedidos para mostrar.</p>
          )}
        </div>
      )}

      {vistaAbierta && (
        <VistaCotizacion orden={vistaAbierta} onCerrar={() => setVistaAbierta(null)} />
      )}
    </div>
  )
}

function Cotizaciones() {
  const [vista, setVista] = useState('preaprobadas')
  const [ordenes, setOrdenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [aprobando, setAprobando] = useState(null)
  const [duplicarDesde, setDuplicarDesde] = useState(null)
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [vistaAbierta, setVistaAbierta] = useState(null)
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
    if (!confirm('¿Aprobar este pedido y enviarlo a producción?')) return
    setAprobando(id)
    try {
      await axios.post(`https://packtech-production.up.railway.app/ordenes-produccion/${id}/aprobar`)
      cargar()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al aprobar el pedido.')
    } finally {
      setAprobando(null)
    }
  }

  const duplicar = (orden) => {
    setDuplicarDesde({ ...orden, timestamp: Date.now() })
  }

  const abrirEdicion = (orden) => {
    setEditando({
      id: orden.id,
      codigo: orden.codigo,
      ruc: orden.ruc || '',
      nombre_cliente: orden.cliente,
      numero_std: orden.numero_std,
      descripcion: orden.descripcion || '',
      cantidad: orden.cantidad,
      unidad: orden.unidad,
      moneda: orden.moneda || 'Soles',
      vendedor: orden.vendedor || '',
      fecha_entrega: orden.fecha_entrega || '',
      precio_unitario: orden.precio_unitario || '',
      unidad_precio: orden.unidad_precio || 'kg',
      millares: orden.millares || '',
      direccion_entrega: orden.direccion_entrega || '',
      numero_contacto: orden.numero_contacto || '',
      email_cliente: orden.email_cliente || '',
      telefono_cliente: orden.telefono_cliente || ''
    })
  }

  const guardarEdicion = async () => {
    setGuardando(true)
    try {
      await axios.put(`https://packtech-production.up.railway.app/ordenes-produccion/${editando.id}`, {
        codigo: editando.codigo,
        ruc: editando.ruc || null,
        nombre_cliente: editando.nombre_cliente,
        numero_std: parseInt(editando.numero_std) || 0,
        descripcion: editando.descripcion,
        cantidad: parseFloat(editando.cantidad),
        unidad: editando.unidad,
        estado: 'Preaprobada',
        moneda: editando.moneda,
        vendedor: editando.vendedor || null,
        fecha_entrega: editando.fecha_entrega || null,
        precio_unitario: editando.precio_unitario ? parseFloat(editando.precio_unitario) : null,
        unidad_precio: editando.unidad_precio,
        millares: editando.millares ? parseFloat(editando.millares) : null,
        direccion_entrega: editando.direccion_entrega || null,
        numero_contacto: editando.numero_contacto || null,
        email_cliente: editando.email_cliente || null,
        telefono_cliente: editando.telefono_cliente || null
      })
      setEditando(null)
      cargar()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al editar el pedido.')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este pedido? Esta acción no se puede deshacer.')) return
    try {
      await axios.delete(`https://packtech-production.up.railway.app/ordenes-produccion/${id}`)
      cargar()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al eliminar el pedido.')
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pedidos</h1>
        <p className="text-slate-500 text-sm mt-1">
          {vendedorOAdmin
            ? 'Registra los pedidos de tus clientes y apruébalos para enviarlos a producción.'
            : 'Seguimiento de pedidos pendientes de aprobación.'}
        </p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setVista('preaprobadas')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            vista === 'preaprobadas' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Por Aprobar
        </button>
        <button
          onClick={() => setVista('seguimiento')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            vista === 'seguimiento' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Seguimiento
        </button>
      </div>

      {vista === 'seguimiento' && <VistaSeguimiento />}

      {vista === 'preaprobadas' && (
        <>
      {vendedorOAdmin && <FormularioCotizacion onCreada={cargar} duplicarDesde={duplicarDesde} />}

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
                  {vendedorOAdmin && <th className="px-4 py-3 text-right"></th>}
                </tr>
              </thead>
              <tbody>
                {ordenes.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setVistaAbierta(o)}
                    className="border-t border-slate-100 cursor-pointer hover:bg-slate-50"
                  >
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
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => aprobar(o.id)}
                          disabled={aprobando === o.id}
                          className="bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-green-800 disabled:opacity-50"
                        >
                          {aprobando === o.id ? 'Aprobando...' : '✓ Aprobar'}
                        </button>
                      </td>
                    )}
                    {vendedorOAdmin && (
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <MenuAcciones
                          onEditar={() => abrirEdicion(o)}
                          onDuplicar={() => duplicar(o)}
                          onEliminar={() => eliminar(o.id)}
                        />
                      </td>
                    )}
                  </tr>
                ))}
                {ordenes.length === 0 && (
                  <tr>
                    <td colSpan={vendedorOAdmin ? 10 : 6} className="px-4 py-6 text-center text-slate-400">
                      No hay pedidos pendientes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </>
      )}

      {vistaAbierta && (
        <VistaCotizacion orden={vistaAbierta} onCerrar={() => setVistaAbierta(null)} />
      )}

      {editando && (
        <ModalEditar
          titulo="Editar Pedido"
          campos={[
            { name: 'codigo', label: 'N° de Pedido' },
            { name: 'ruc', label: 'RUC' },
            { name: 'nombre_cliente', label: 'Cliente' },
            { name: 'numero_std', label: 'N° Estándar', type: 'number' },
            { name: 'descripcion', label: 'Producto / Descripción' },
            { name: 'cantidad', label: 'Cantidad', type: 'number' },
            { name: 'unidad', label: 'Unidad' },
            { name: 'moneda', label: 'Moneda' },
            { name: 'vendedor', label: 'Vendedor' },
            { name: 'fecha_entrega', label: 'Fecha de entrega', type: 'date' },
            { name: 'precio_unitario', label: 'Precio unitario', type: 'number' },
            { name: 'unidad_precio', label: 'Precio por (kg / millares)' },
            { name: 'millares', label: 'Millares', type: 'number' },
            { name: 'direccion_entrega', label: 'Dirección de entrega' },
            { name: 'numero_contacto', label: 'N° de contacto' },
            { name: 'email_cliente', label: 'Email del cliente' },
            { name: 'telefono_cliente', label: 'Teléfono del cliente' }
          ]}
          valores={editando}
          onCambio={(campo, valor) => setEditando({ ...editando, [campo]: valor })}
          onGuardar={guardarEdicion}
          onCerrar={() => setEditando(null)}
          guardando={guardando}
        />
      )}
    </div>
  )
}

export default Cotizaciones