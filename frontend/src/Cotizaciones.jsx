import { useEffect, useState, useRef } from 'react'
import axios from './api'
import { esVendedorOMas } from './roles'
import MenuAcciones from './MenuAcciones'
import VistaCotizacionDoc from './VistaCotizacionDoc'
import { cargarFiltros, guardarFiltros, PERIODOS_RAPIDOS } from './filtrosPersistentes'

const CLAVE_BORRADOR_COTIZACION = 'packtech_borrador_cotizacion'
const FORM_VACIO_COTIZACION = {
  codigo: '', ruc: '', nombre_cliente: '', vendedor: '', moneda: 'Soles',
  incluye_igv: false,
  forma_pago: '50% adelantado y 50% contra entrega',
  tiempo_entrega: '10 días de aprobado el diseño o según mutuo acuerdo',
  validez_oferta: '10 días',
  observaciones: ''
}

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
  descripcion: '', medidas: '', cantidad: '', unidad: 'kg', precio_unitario: '',
  tiene_clisse: false, nombre_clisse: '', cantidad_colores: '', precio_clisse: ''
}

function FormularioCotizacion({ onCreada, duplicarDesde, editando, onCancelarEdicion }) {
  const borradorGuardado = cargarFiltros(CLAVE_BORRADOR_COTIZACION, {
    form: FORM_VACIO_COTIZACION, items: [], itemActual: ITEM_VACIO, procesosItemActual: []
  })

  const [form, setForm] = useState(borradorGuardado.form)
  const [items, setItems] = useState(borradorGuardado.items)
  const [itemActual, setItemActual] = useState(borradorGuardado.itemActual)
  const [procesosItemActual, setProcesosItemActual] = useState(borradorGuardado.procesosItemActual)
  const [editandoId, setEditandoId] = useState(null)

  // Guarda automáticamente lo que llevas escrito, para que no se pierda si cambias de pestaña
  useEffect(() => {
    guardarFiltros(CLAVE_BORRADOR_COTIZACION, { form, items, itemActual, procesosItemActual })
  }, [form, items, itemActual, procesosItemActual])

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
          procesos_plan: it.procesos_plan || null,
          tiene_clisse: it.tiene_clisse || false,
          nombre_clisse: it.nombre_clisse || '',
          cantidad_colores: it.cantidad_colores || '',
          precio_clisse: it.precio_clisse || ''
        }))
      )
      setItemActual({ ...ITEM_VACIO })
      setProcesosItemActual([])
      setClienteSeleccionado({ ruc: duplicarDesde.ruc || '', nombre: duplicarDesde.cliente || '' })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [duplicarDesde])

  useEffect(() => {
    if (editando) {
      setEditandoId(editando.id)
      setForm({
        codigo: editando.codigo || '',
        ruc: editando.ruc || '',
        nombre_cliente: editando.cliente || '',
        vendedor: editando.vendedor || '',
        moneda: editando.moneda || 'Soles',
        incluye_igv: editando.incluye_igv || false,
        forma_pago: editando.forma_pago || '',
        tiempo_entrega: editando.tiempo_entrega || '',
        validez_oferta: editando.validez_oferta || '',
        observaciones: editando.observaciones || ''
      })
      setItems(
        (editando.items || []).map((it) => ({
          descripcion: it.descripcion || '',
          medidas: it.medidas || '',
          cantidad: it.cantidad || '',
          unidad: it.unidad || 'kg',
          precio_unitario: it.precio_unitario || '',
          procesos_plan: it.procesos_plan || null,
          tiene_clisse: it.tiene_clisse || false,
          nombre_clisse: it.nombre_clisse || '',
          cantidad_colores: it.cantidad_colores || '',
          precio_clisse: it.precio_clisse || ''
        }))
      )
      setItemActual({ ...ITEM_VACIO })
      setProcesosItemActual([])
      setClienteSeleccionado({ ruc: editando.ruc || '', nombre: editando.cliente || '' })
      setError(null)
      setExito(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [editando])

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
    if (itemActual.tiene_clisse && !itemActual.nombre_clisse.trim()) {
      setError('Escribe el nombre del Clisse o marca "No" en "¿Lleva Clisse?".')
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
      if (itemActual.tiene_clisse && !itemActual.nombre_clisse.trim()) {
        setError('Escribe el nombre del Clisse del último producto o desactiva esa opción.')
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
      const payload = {
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
          procesos_plan: it.procesos_plan || null,
          tiene_clisse: !!it.tiene_clisse,
          nombre_clisse: it.tiene_clisse ? (it.nombre_clisse || null) : null,
          cantidad_colores: it.tiene_clisse && it.cantidad_colores ? parseInt(it.cantidad_colores) : null,
          precio_clisse: it.tiene_clisse && it.precio_clisse ? parseFloat(it.precio_clisse) : null
        }))
      }

      if (editandoId) {
        await axios.put(`https://packtech-production.up.railway.app/cotizaciones/${editandoId}`, payload)
      } else {
        await axios.post('https://packtech-production.up.railway.app/cotizaciones', payload)
      }

      setExito(true)
      setForm({ ...FORM_VACIO_COTIZACION })
      setItems([])
      setItemActual({ ...ITEM_VACIO })
      setProcesosItemActual([])
      setClienteSeleccionado(null)
      setEditandoId(null)
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
      <h2 className="text-xl font-bold text-slate-800 mb-1">{editandoId ? 'Editar Cotización' : 'Nueva Cotización'}</h2>
      <p className="text-sm text-slate-500 mb-5">
        {editandoId ? 'Modifica los datos y guarda los cambios.' : 'Completa los datos y agrega los productos que vas a cotizar.'}
      </p>

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
            autoComplete="off"
            placeholder="Tu nombre, ej. Fernanda"
            className={estilo}
          />
          {sugerenciasVendedores.length > 0 && (
            <div className="absolute z-10 bg-white border border-slate-200 rounded-lg shadow-md mt-1 w-full max-h-40 overflow-y-auto">
              {sugerenciasVendedores.map((v) => (
                <button
                  type="button"
                  key={v.id}
                  onClick={() => { setForm({ ...form, vendedor: v.nombre }); setSugerenciasVendedores([]) }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm text-slate-800"
                >
                  {v.nombre}
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, incluye_igv: true })}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  form.incluye_igv ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                }`}
              >
                Con IGV (18%)
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, incluye_igv: false })}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  !form.incluye_igv ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                }`}
              >
                Sin IGV
              </button>
            </div>
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

          <div className="border-t border-slate-200 pt-3">
            <label className="block text-sm font-medium text-slate-600 mb-2">¿Este producto lleva Clisse?</label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => setItemActual({ ...itemActual, tiene_clisse: true })}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  itemActual.tiene_clisse ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                }`}
              >
                Sí
              </button>
              <button
                type="button"
                onClick={() => setItemActual({ ...itemActual, tiene_clisse: false, nombre_clisse: '', cantidad_colores: '', precio_clisse: '' })}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  !itemActual.tiene_clisse ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                }`}
              >
                No
              </button>
            </div>

            {itemActual.tiene_clisse && (
              <div className="grid grid-cols-2 gap-3 bg-white border border-blue-100 rounded-lg p-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-600 mb-1">Nombre del Clisse</label>
                  <input
                    type="text"
                    value={itemActual.nombre_clisse}
                    onChange={(e) => setItemActual({ ...itemActual, nombre_clisse: e.target.value })}
                    placeholder="Ej. Hielo Rosell x3kg"
                    className={estilo}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Cantidad de colores</label>
                  <input
                    type="number"
                    step="1"
                    value={itemActual.cantidad_colores}
                    onChange={(e) => setItemActual({ ...itemActual, cantidad_colores: e.target.value })}
                    placeholder="Ej. 1"
                    className={estilo}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Precio del Clisse ({form.moneda === 'Dólares' ? '$' : 'S/'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemActual.precio_clisse}
                    onChange={(e) => setItemActual({ ...itemActual, precio_clisse: e.target.value })}
                    placeholder="Ej. 250.00"
                    className={estilo}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Ruta de procesos (opcional)</label>
            <p className="text-xs text-slate-400 mb-2">Toca los procesos en el orden que van a pasar.</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {TODOS_LOS_PROCESOS.filter((p) => !procesosItemActual.includes(p)).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => agregarProceso(p)}
                  className="px-3 py-1 rounded-lg text-xs font-medium bg-white text-slate-600 border border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700"
                >
                  + {p}
                </button>
              ))}
            </div>
            {procesosItemActual.length > 0 && (
              <div className="space-y-1.5">
                {procesosItemActual.map((p, i) => (
                  <div key={`${p}-${i}`} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                    <span className="text-xs font-bold text-blue-700 bg-white rounded-full w-5 h-5 flex items-center justify-center border border-blue-300">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium text-blue-800">{p}</span>
                    <button type="button" onClick={() => moverProceso(i, -1)} disabled={i === 0} className="text-blue-600 hover:text-blue-800 disabled:opacity-30 px-1">↑</button>
                    <button type="button" onClick={() => moverProceso(i, 1)} disabled={i === procesosItemActual.length - 1} className="text-blue-600 hover:text-blue-800 disabled:opacity-30 px-1">↓</button>
                    <button type="button" onClick={() => quitarProceso(i)} className="text-red-500 hover:text-red-700 px-1">×</button>
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
                  {it.tiene_clisse && (
                    <p className="text-xs text-purple-700">
                      Clisse: {it.nombre_clisse} · {it.cantidad_colores || '-'} colores · {form.moneda === 'Dólares' ? '$' : 'S/'} {it.precio_clisse || '0.00'}
                    </p>
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Forma de pago</label>
            <input
              type="text"
              name="forma_pago"
              value={form.forma_pago}
              onChange={manejarCambio}
              className={estilo}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tiempo de entrega</label>
            <input
              type="text"
              name="tiempo_entrega"
              value={form.tiempo_entrega}
              onChange={manejarCambio}
              className={estilo}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Validez de la oferta</label>
            <input
              type="text"
              name="validez_oferta"
              value={form.validez_oferta}
              onChange={manejarCambio}
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

        <div className="flex gap-3">
          {editandoId && (
            <button
              type="button"
              onClick={() => {
                setEditandoId(null)
                setForm({ ...FORM_VACIO_COTIZACION })
                setItems([])
                setItemActual({ ...ITEM_VACIO })
                setProcesosItemActual([])
                setClienteSeleccionado(null)
                setError(null)
                setExito(false)
                if (onCancelarEdicion) onCancelarEdicion()
              }}
              className="flex-1 border border-slate-300 rounded-lg py-3 font-semibold text-base text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={enviando}
            className="flex-1 bg-green-600 text-white rounded-lg py-3 font-semibold text-base hover:bg-green-700 disabled:opacity-50"
          >
            {enviando ? 'Guardando...' : editandoId ? 'Guardar Cambios' : 'Guardar Cotización'}
          </button>
        </div>
      </form>
    </div>
  )
}

const CLAVE_FILTROS_COTIZACIONES = 'packtech_filtros_cotizaciones'

function ListaCotizaciones({ onDuplicar, onEditar, refrescarTrigger }) {
  const filtrosGuardados = cargarFiltros(CLAVE_FILTROS_COTIZACIONES, {
    codigo: '', cliente: '', periodo: 'todo', desde: '', hasta: ''
  })

  const [cotizaciones, setCotizaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [vistaAbierta, setVistaAbierta] = useState(null)
  const [filtroCodigo, setFiltroCodigo] = useState(filtrosGuardados.codigo)
  const [filtroCliente, setFiltroCliente] = useState(filtrosGuardados.cliente)
  const [periodo, setPeriodo] = useState(filtrosGuardados.periodo)
  const [fechaDesde, setFechaDesde] = useState(filtrosGuardados.desde)
  const [fechaHasta, setFechaHasta] = useState(filtrosGuardados.hasta)
  const [hayMas, setHayMas] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const controladorRef = useRef(null)

  const rangoPeriodo = () => {
    if (periodo === 'custom') return { desde: fechaDesde, hasta: fechaHasta }
    const p = PERIODOS_RAPIDOS.find((x) => x.id === periodo) || PERIODOS_RAPIDOS[0]
    return { desde: p.desde(), hasta: p.hasta() }
  }

  const paramsFiltro = () => {
    const { desde, hasta } = rangoPeriodo()
    return {
      q: filtroCodigo.trim() || filtroCliente.trim() || undefined,
      fecha_desde: desde || undefined,
      fecha_hasta: hasta || undefined
    }
  }

  const cargar = () => {
    if (controladorRef.current) controladorRef.current.abort()
    const controlador = new AbortController()
    controladorRef.current = controlador

    setCargando(true)
    axios.get('https://packtech-production.up.railway.app/cotizaciones/filtrar', {
      params: { ...paramsFiltro(), limit: 20 },
      signal: controlador.signal
    })
      .then((res) => {
        setCotizaciones(res.data)
        setHayMas(res.data.length === 20)
        setError(null)
      })
      .catch((err) => {
        if (axios.isCancel(err) || err.code === 'ERR_CANCELED') return
        console.error(err)
        setError('No se pudo conectar con el backend.')
      })
      .finally(() => { if (controladorRef.current === controlador) setCargando(false) })
  }

  const cargarMas = () => {
    if (cotizaciones.length === 0) return
    setCargandoMas(true)
    const ultimoId = cotizaciones[cotizaciones.length - 1].id
    axios.get('https://packtech-production.up.railway.app/cotizaciones/filtrar', {
      params: { ...paramsFiltro(), limit: 20, antes_de: ultimoId }
    })
      .then((res) => {
        setCotizaciones((actual) => [...actual, ...res.data])
        setHayMas(res.data.length === 20)
      })
      .catch((err) => console.error(err))
      .finally(() => setCargandoMas(false))
  }

  // Persiste los filtros para que sobrevivan cambios de pestaña y recargas de página
  useEffect(() => {
    guardarFiltros(CLAVE_FILTROS_COTIZACIONES, {
      codigo: filtroCodigo, cliente: filtroCliente, periodo, desde: fechaDesde, hasta: fechaHasta
    })
  }, [filtroCodigo, filtroCliente, periodo, fechaDesde, fechaHasta])

  useEffect(() => {
    const t = setTimeout(cargar, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroCodigo, filtroCliente, periodo, fechaDesde, fechaHasta, refrescarTrigger])

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar esta cotización? Esta acción no se puede deshacer.')) return
    try {
      await axios.delete(`https://packtech-production.up.railway.app/cotizaciones/${id}`)
      cargar()
    } catch (err) {
      alert(err.response?.data?.detail || 'No se pudo eliminar.')
    }
  }

  const hayFiltrosActivos = filtroCodigo || filtroCliente || periodo !== 'todo'

  const limpiarFiltros = () => {
    setFiltroCodigo('')
    setFiltroCliente('')
    setPeriodo('todo')
    setFechaDesde('')
    setFechaHasta('')
  }

  return (
    <div>
      <div className="space-y-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          {PERIODOS_RAPIDOS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriodo(p.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                periodo === p.id
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setPeriodo('custom')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              periodo === 'custom'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            }`}
          >
            Personalizado
          </button>
          {periodo === 'custom' && (
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <span>Desde</span>
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
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={filtroCodigo}
            onChange={(e) => setFiltroCodigo(e.target.value)}
            placeholder="Buscar N° Cotización..."
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-44 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
          />
          <input
            type="text"
            value={filtroCliente}
            onChange={(e) => setFiltroCliente(e.target.value)}
            placeholder="Buscar Cliente..."
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-44"
          />
          {hayFiltrosActivos && (
            <button
              onClick={limpiarFiltros}
              className="text-sm text-slate-400 hover:text-slate-700 underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-red-600 mb-3">{error}</p>}

      {cargando && cotizaciones.length === 0 ? (
        <p className="text-slate-500">Cargando...</p>
      ) : (
        <>
          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">N° Cotización</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Vendedor</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {cotizaciones.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setVistaAbierta(c)}
                    className="border-t border-slate-100 cursor-pointer hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{c.codigo}</td>
                    <td className="px-4 py-3">{c.cliente}</td>
                    <td className="px-4 py-3">{c.vendedor || '—'}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {c.moneda === 'Dólares' ? '$' : 'S/'} {Number(c.total || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">{formatearFecha(c.fecha)}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <MenuAcciones
                        onEditar={() => onEditar(c)}
                        onDuplicar={() => onDuplicar(c)}
                        onEliminar={() => eliminar(c.id)}
                      />
                    </td>
                  </tr>
                ))}
                {cotizaciones.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-4 py-6 text-center text-slate-400">
                      No hay cotizaciones registradas todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {hayMas && cotizaciones.length > 0 && (
            <div className="flex justify-center mt-4">
              <button
                onClick={cargarMas}
                disabled={cargandoMas}
                className="text-sm text-slate-600 border border-slate-300 rounded-lg px-4 py-2 hover:bg-slate-50 disabled:opacity-50"
              >
                {cargandoMas ? 'Cargando...' : 'Cargar más cotizaciones'}
              </button>
            </div>
          )}
        </>
      )}

      {vistaAbierta && (
        <VistaCotizacionDoc cotizacion={vistaAbierta} onCerrar={() => setVistaAbierta(null)} />
      )}
    </div>
  )
}

function Cotizaciones() {
  const [duplicarDesde, setDuplicarDesde] = useState(null)
  const [editando, setEditando] = useState(null)
  const [refrescar, setRefrescar] = useState(0)

  const manejarDuplicar = (cot) => {
    setEditando(null)
    setDuplicarDesde({ ...cot, timestamp: Date.now() })
  }

  const manejarEditar = (cot) => {
    setDuplicarDesde(null)
    setEditando({ ...cot, timestamp: Date.now() })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cotizaciones</h1>
        <p className="text-slate-500 text-sm mt-1">Crea, filtra y da seguimiento a cada cotización.</p>
      </div>

      <FormularioCotizacion
        onCreada={() => { setRefrescar((n) => n + 1); setEditando(null); setDuplicarDesde(null) }}
        duplicarDesde={duplicarDesde}
        editando={editando}
        onCancelarEdicion={() => setEditando(null)}
      />

      <ListaCotizaciones onDuplicar={manejarDuplicar} onEditar={manejarEditar} refrescarTrigger={refrescar} />
    </div>
  )
}

export default Cotizaciones