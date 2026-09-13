import { useEffect, useState, useRef } from 'react'
import axios from './api'
import { esVendedorOMas } from './roles'
import MenuAcciones from './MenuAcciones'
import VistaCotizacionDoc from './VistaCotizacionDoc'

const formatearFecha = (fecha) => {
  if (!fecha) return ''
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)}`
}

const TODOS_LOS_PROCESOS = ['Extrusión', 'Laminado', 'Pegado', 'Impresión', 'Sellado', 'Corte']
const UNIDADES_PRECIO = [
  { value: 'kg', label: 'Kilos (Kg)' },
  { value: 'millares', label: 'Millares' },
  { value: 'unidades', label: 'Unidades' },
  { value: 'rollos', label: 'Rollos' }
]

const ITEM_VACIO = {
  descripcion: '', medidas: '', cantidad: '', unidad: 'kg', precio_unitario: ''
}

function FormularioCotizacion({ onCreada, duplicarDesde }) {
  const [form, setForm] = useState({
    codigo: '',
    ruc: '',
    nombre_cliente: '',
    vendedor: '',
    moneda: 'Soles',
    incluye_igv: false,
    forma_pago: '',
    tiempo_entrega: '',
    validez_oferta: '',
    observaciones: ''
  })

  const [items, setItems] = useState([])
  const [itemActual, setItemActual] = useState({ ...ITEM_VACIO })
  const [procesosItemActual, setProcesosItemActual] = useState([])

  const [sugerenciasClientes, setSugerenciasClientes] = useState([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [sugerenciasVendedores, setSugerenciasVendedores] = useState([])

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [exito, setExito] = useState(false)

  const manejarCambio = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
  }
  const manejarCambioItem = (e) => setItemActual({ ...itemActual, [e.target.name]: e.target.value })

  const agregarProceso = (proceso) => setProcesosItemActual((actual) => [...actual, proceso])
  const quitarProceso = (index) => setProcesosItemActual((actual) => actual.filter((_, i) => i !== index))
  const moverProceso = (index, direccion) => {
    setProcesosItemActual((actual) => {
      const nuevo = [...actual]
      const destino = index + direccion
      if (destino < 0 || destino >= nuevo.length) return actual
      ;[nuevo[index], nuevo[destino]] = [nuevo[destino], nuevo[index]]
      return nuevo
    })
  }

  useEffect(() => {
    if (duplicarDesde) {
      setForm({
        codigo: '',
        ruc: duplicarDesde.ruc || '',
        nombre_cliente: duplicarDesde.cliente || '',
        vendedor: duplicarDesde.vendedor || '',
        moneda: duplicarDesde.moneda || 'Soles',
        incluye_igv: duplicarDesde.incluye_igv || false,
        forma_pago: duplicarDesde.forma_pago || '',
        tiempo_entrega: duplicarDesde.tiempo_entrega || '',
        validez_oferta: duplicarDesde.validez_oferta || '',
        observaciones: duplicarDesde.observaciones || ''
      })
      setItems(
        (duplicarDesde.items || []).map((it) => ({
          descripcion: it.descripcion || '',
          medidas: it.medidas || '',
          cantidad: it.cantidad || '',
          unidad: it.unidad || 'kg',
          precio_unitario: it.precio_unitario || '',
          procesos_plan: it.procesos_plan || null
        }))
      )
      setItemActual({ ...ITEM_VACIO })
      setProcesosItemActual([])
      setClienteSeleccionado({ ruc: duplicarDesde.ruc || '', nombre: duplicarDesde.cliente || '' })
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

  const estimarCosto = (it) => {
    const precio = parseFloat(it.precio_unitario)
    const cant = parseFloat(it.cantidad)
    if (!precio || !cant) return null
    return precio * cant
  }
  const costoEstimadoActual = estimarCosto(itemActual)

  const agregarItem = () => {
    if (!itemActual.descripcion.trim()) {
      setError('Escribe qué producto o servicio es antes de agregarlo.')
      return
    }
    if (!itemActual.cantidad) {
      setError('Indica la cantidad de este ítem.')
      return
    }
    setError(null)
    setItems((actual) => [...actual, { ...itemActual, procesos_plan: procesosItemActual.join(',') || null }])
    setItemActual({ ...ITEM_VACIO })
    setProcesosItemActual([])
  }

  const quitarItem = (index) => setItems((actual) => actual.filter((_, i) => i !== index))

  const manejarEnvio = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    setExito(false)

    let itemsFinal = [...items]
    if (itemActual.descripcion || itemActual.cantidad) {
      if (!itemActual.descripcion.trim() || !itemActual.cantidad) {
        setError('Completa el último producto (descripción y cantidad) o quítalo antes de guardar.')
        setEnviando(false)
        return
      }
      itemsFinal.push({ ...itemActual, procesos_plan: procesosItemActual.join(',') || null })
    }

    if (itemsFinal.length === 0) {
      setError('Agrega al menos un producto a la cotización.')
      setEnviando(false)
      return
    }

    if (!form.codigo.trim()) {
      setError('Escribe el número de esta cotización antes de guardar.')
      setEnviando(false)
      return
    }

    try {
      await axios.post('https://packtech-production.up.railway.app/cotizaciones', {
        codigo: form.codigo.trim(),
        ruc: form.ruc || null,
        nombre_cliente: form.nombre_cliente,
        vendedor: form.vendedor || null,
        moneda: form.moneda,
        incluye_igv: form.incluye_igv,
        forma_pago: form.forma_pago || null,
        tiempo_entrega: form.tiempo_entrega || null,
        validez_oferta: form.validez_oferta || null,
        observaciones: form.observaciones || null,
        items: itemsFinal.map((it) => ({
          descripcion: it.descripcion || null,
          medidas: it.medidas || null,
          cantidad: parseFloat(it.cantidad),
          unidad: it.unidad || 'kg',
          precio_unitario: it.precio_unitario ? parseFloat(it.precio_unitario) : null,
          procesos_plan: it.procesos_plan || null
        }))
      })

      setExito(true)
      setForm({
        codigo: '', ruc: '', nombre_cliente: '', vendedor: '', moneda: 'Soles',
        incluye_igv: false, forma_pago: '', tiempo_entrega: '', validez_oferta: '', observaciones: ''
      })
      setItems([])
      setItemActual({ ...ITEM_VACIO })
      setProcesosItemActual([])
      setClienteSeleccionado(null)
      if (onCreada) onCreada()
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudo guardar la cotización.')
    } finally {
      setEnviando(false)
    }
  }

  const estilo = "w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-1">Nueva Cotización</h2>
      <p className="text-sm text-slate-500 mb-5">Completa los datos y agrega los productos que vas a cotizar.</p>

      <form onSubmit={manejarEnvio} className="space-y-5">
                <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Número de esta cotización</label>
          <input
            type="text"
            name="codigo"
            value={form.codigo}
            onChange={manejarCambio}
            placeholder="Ej. 181 (el número que le vas a poner tú)"
            className={estilo}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1">RUC (opcional)</label>
            <input
              type="text"
              name="ruc"
              value={form.ruc}
              maxLength={11}
              onChange={(e) => { setClienteSeleccionado(null); manejarCambio(e) }}
              autoComplete="off"
              placeholder="20100070970"
              className={estilo}
            />
          </div>
          <div className="relative">
            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
            <input
              type="text"
              name="nombre_cliente"
              value={form.nombre_cliente}
              onChange={(e) => { setClienteSeleccionado(null); manejarCambio(e) }}
              autoComplete="off"
              placeholder="Escribe el nombre, ej. FABREPLAST"
              className={estilo}
              required
            />
            {sugerenciasClientes.length > 0 && (
              <div className="absolute z-10 bg-white border border-slate-200 rounded-lg shadow-md mt-1 w-full max-h-48 overflow-y-auto">
                {sugerenciasClientes.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => {
                      setForm({ ...form, nombre_cliente: c.nombre, ruc: c.ruc || '' })
                      setClienteSeleccionado(c)
                      setSugerenciasClientes([])
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm"
                  >
                    <span className="font-medium text-slate-800">{c.nombre}</span>
                    {c.ruc && <span className="text-slate-400 ml-2">{c.ruc}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="relative">
          <label className="block text-sm font-medium text-slate-700 mb-1">Vendedor (opcional)</label>
          <input
            type="text"
            name="vendedor"
            value={form.vendedor}
            onChange={manejarCambio}
            placeholder="Tu nombre, ej. Fernanda"
            className={estilo}
          />
          {sugerenciasVendedores.length > 0 && (
            <div className="absolute z-10 bg-white border border-slate-200 rounded-lg shadow-md mt-1 w-full max-h-40 overflow-y-auto">
              {sugerenciasVendedores.map((v) => (
                <button
                  type="button"
                  key={v}
                  onClick={() => { setForm({ ...form, vendedor: v }); setSugerenciasVendedores([]) }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm text-slate-800"
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Moneda</label>
            <select
              name="moneda"
              value={form.moneda}
              onChange={manejarCambio}
              className={estilo}
            >
              <option value="Soles">Soles (S/)</option>
              <option value="Dólares">Dólares ($)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">¿Lleva IGV?</label>
            <select
              value={form.incluye_igv ? 'si' : 'no'}
              onChange={(e) => setForm({ ...form, incluye_igv: e.target.value === 'si' })}
              className={estilo}
            >
              <option value="no">Sin IGV</option>
              <option value="si">Con IGV (18%)</option>
            </select>
          </div>
        </div>

        {/* ---- Agregar producto ---- */}
        <div className="border-2 border-dashed border-blue-200 rounded-xl p-4 bg-blue-50/40 space-y-3">
          <h3 className="font-semibold text-slate-700 text-sm">Agregar producto a la cotización</h3>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">¿Qué es? (descripción)</label>
            <input
              type="text"
              name="descripcion"
              value={itemActual.descripcion}
              onChange={manejarCambioItem}
              placeholder="Ej. BOLSA FABREPLAST"
              className={estilo}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Medidas (opcional)</label>
            <input
              type="text"
              name="medidas"
              value={itemActual.medidas}
              onChange={manejarCambioItem}
              placeholder="Ej. 8pulg x 12pulg x 3.50 ESP."
              className={estilo}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Cantidad</label>
              <input
                type="number"
                step="0.01"
                name="cantidad"
                value={itemActual.cantidad}
                onChange={manejarCambioItem}
                placeholder="Ej. 10"
                className={estilo}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">¿Cantidad en qué?</label>
              <select
                name="unidad"
                value={itemActual.unidad}
                onChange={manejarCambioItem}
                className={estilo}
              >
                {UNIDADES_PRECIO.map((u) => (
                  <option key={u.value} value={u.value}>{u.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Precio por {UNIDADES_PRECIO.find((u) => u.value === itemActual.unidad)?.label.toLowerCase()}
            </label>
            <input
              type="number"
              step="0.01"
              name="precio_unitario"
              value={itemActual.precio_unitario}
              onChange={manejarCambioItem}
              placeholder="Ej. 35.00"
              className={estilo}
            />
            {costoEstimadoActual !== null && (
              <p className="text-xs text-slate-500 mt-1">
                Subtotal de este producto: {form.moneda === 'Dólares' ? '$' : 'S/'} {costoEstimadoActual.toFixed(2)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Ruta de procesos (opcional)</label>
            <p className="text-xs text-slate-400 mb-1.5">Toca los procesos en el orden que van a pasar.</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {TODOS_LOS_PROCESOS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => agregarProceso(p)}
                  className="px-3 py-1.5 rounded-full border border-blue-300 text-blue-700 text-sm bg-white hover:bg-blue-50"
                >
                  + {p}
                </button>
              ))}
            </div>
            {procesosItemActual.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-2">
                {procesosItemActual.map((p, i) => (
                  <div key={i} className="flex items-center gap-1 bg-blue-100 text-blue-800 rounded-full px-2.5 py-1 text-xs font-medium">
                    <span>{i + 1}. {p}</span>
                    <button type="button" onClick={() => moverProceso(i, -1)} className="text-blue-500 hover:text-blue-900">◀</button>
                    <button type="button" onClick={() => moverProceso(i, 1)} className="text-blue-500 hover:text-blue-900">▶</button>
                    <button type="button" onClick={() => quitarProceso(i)} className="text-red-500 hover:text-red-700 ml-1">×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={agregarItem}
            className="w-full bg-blue-700 text-white rounded-lg py-2.5 font-medium hover:bg-blue-800"
          >
            + Agregar este producto a la lista
          </button>
        </div>

        {/* ---- Lista de productos agregados ---- */}
        {items.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-700 text-sm">Productos en esta cotización ({items.length})</h3>
            {items.map((it, i) => (
              <div key={i} className="flex justify-between items-start bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                <div>
                  <p className="font-medium text-slate-800 text-sm">{it.descripcion}</p>
                  <p className="text-xs text-slate-500">
                    {it.cantidad} {UNIDADES_PRECIO.find((u) => u.value === it.unidad)?.label.toLowerCase()}
                    {it.precio_unitario && ` · ${form.moneda === 'Dólares' ? '$' : 'S/'} ${it.precio_unitario} c/u`}
                  </p>
                  {it.procesos_plan && (
                    <p className="text-xs text-blue-600">{it.procesos_plan.split(',').join(' → ')}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => quitarItem(i)}
                  className="text-red-500 text-xs font-medium hover:text-red-700 shrink-0 ml-2"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Forma de pago (opcional)</label>
            <input
              type="text"
              name="forma_pago"
              value={form.forma_pago}
              onChange={manejarCambio}
              placeholder="Ej. 50% adelantado y 50% contra entrega"
              className={estilo}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tiempo de entrega (opcional)</label>
            <input
              type="text"
              name="tiempo_entrega"
              value={form.tiempo_entrega}
              onChange={manejarCambio}
              placeholder="Ej. 10 días o según mutuo acuerdo"
              className={estilo}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Validez de la oferta (opcional)</label>
            <input
              type="text"
              name="validez_oferta"
              value={form.validez_oferta}
              onChange={manejarCambio}
              placeholder="Ej. 10 días"
              className={estilo}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observaciones (opcional)</label>
            <textarea
              name="observaciones"
              value={form.observaciones}
              onChange={manejarCambio}
              placeholder="Cualquier detalle adicional para el cliente"
              rows={2}
              className={estilo}
            />
          </div>
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
        {exito && <p className="text-green-700 text-sm bg-green-50 border border-green-100 rounded-lg px-3 py-2">Cotización guardada correctamente.</p>}

        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-green-600 text-white rounded-lg py-3 font-semibold text-base hover:bg-green-700 disabled:opacity-50"
        >
          {enviando ? 'Guardando...' : 'Guardar Cotización'}
        </button>
      </form>
    </div>
  )
}

function ListaCotizaciones({ onDuplicar }) {
  const [cotizaciones, setCotizaciones] = useState([])
  const [filtro, setFiltro] = useState('')
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [vistaAbierta, setVistaAbierta] = useState(null)
  const controladorRef = useRef(null)

  const cargar = () => {
    if (controladorRef.current) controladorRef.current.abort()
    const controlador = new AbortController()
    controladorRef.current = controlador

    setCargando(true)
    axios.get('https://packtech-production.up.railway.app/cotizaciones/buscar', {
      params: { q: filtro || undefined, limit: 30 },
      signal: controlador.signal
    })
      .then((res) => { setCotizaciones(res.data); setError(null) })
      .catch((err) => {
        if (axios.isCancel(err) || err.code === 'ERR_CANCELED') return
        console.error(err)
        setError('No se pudo conectar con el backend.')
      })
      .finally(() => { if (controladorRef.current === controlador) setCargando(false) })
  }

  useEffect(() => {
    const t = setTimeout(cargar, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro])

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta cotización? Esta acción no se puede deshacer.')) return
    try {
      await axios.delete(`https://packtech-production.up.railway.app/cotizaciones/${id}`)
      cargar()
    } catch (err) {
      alert(err.response?.data?.detail || 'No se pudo eliminar.')
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-6">
      <input
        type="text"
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        placeholder="Buscar por número o cliente..."
        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-base mb-3 bg-white"
      />

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {cargando && cotizaciones.length === 0 ? (
        <p className="text-slate-400 text-center py-6 text-sm">Cargando...</p>
      ) : cotizaciones.length === 0 ? (
        <p className="text-slate-400 text-center py-6 text-sm">No hay cotizaciones registradas todavía.</p>
      ) : (
        <div className="space-y-2">
          {cotizaciones.map((c) => (
            <div
              key={c.id}
              className="bg-white border border-slate-200 rounded-lg px-4 py-3 flex justify-between items-center cursor-pointer hover:border-blue-300"
              onClick={() => setVistaAbierta(c)}
            >
              <div>
                <p className="font-semibold text-slate-800 text-sm">N° {c.codigo}</p>
                <p className="text-xs text-slate-500">{c.cliente}</p>
                <p className="text-xs text-slate-400">{formatearFecha(c.fecha)}</p>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-700 text-sm">
                  {c.moneda === 'Dólares' ? '$' : 'S/'} {Number(c.total || 0).toFixed(2)}
                </p>
                <div onClick={(e) => e.stopPropagation()}>
                  <MenuAcciones
                    opciones={[
                      { texto: 'Ver / Descargar PDF', accion: () => setVistaAbierta(c) },
                      { texto: 'Duplicar', accion: () => onDuplicar(c) },
                      { texto: 'Eliminar', accion: () => eliminar(c.id), peligro: true }
                    ]}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {vistaAbierta && (
        <VistaCotizacionDoc cotizacion={vistaAbierta} onCerrar={() => setVistaAbierta(null)} />
      )}
    </div>
  )
}

function Cotizaciones() {
  const [duplicarDesde, setDuplicarDesde] = useState(null)
  const [refrescar, setRefrescar] = useState(0)

  return (
    <div className="px-4 py-6">
      <FormularioCotizacion
        onCreada={() => setRefrescar((n) => n + 1)}
        duplicarDesde={duplicarDesde}
      />
      <ListaCotizaciones key={refrescar} onDuplicar={setDuplicarDesde} />
    </div>
  )
}

export default Cotizaciones