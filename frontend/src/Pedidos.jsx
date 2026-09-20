// Pantalla de Pedidos: un Pedido agrupa uno o más ítems/productos; cada
// ítem se crea de inmediato como una OrdenProduccion en estado "Preaprobada"
// (vinculada por pedido_id). Al aprobar el Pedido, esas OP pasan a
// "Pendiente" y entran al flujo normal de producción.
// Incluye dos pestañas: "Por Aprobar" (formulario de creación/edición +
// listado con aprobar/editar/duplicar/eliminar) y "Seguimiento" (tarjetas
// de los pedidos ya aprobados, con aviso visual de urgencia por fecha de
// entrega). El formulario soporta Clisse por ítem (informativo, no es un
// producto) y autoguarda su borrador en localStorage, separando "nuevo"
// de "editando" para no mezclar datos entre ambos flujos.
import { useEffect, useState } from 'react'
import axios from './api'
import { esVendedorOMas } from './roles'
import MenuAcciones from './MenuAcciones'
import VistaPedido from './VistaPedido'
import FiltroDesplegable from './FiltroDesplegable'
import { cargarFiltros, guardarFiltros } from './filtrosPersistentes'

const CLAVE_BORRADOR_PEDIDO = 'packtech_borrador_pedido'
const CLAVE_BORRADOR_EDICION_PEDIDO = 'packtech_borrador_pedido_editando'
const CLAVE_COTIZACION_A_PEDIDO = 'packtech_cotizacion_a_pedido'

const formatearFecha = (fecha) => {
  if (!fecha) return ''
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)}`
}

// "Tiempo de entrega" del pedido se sigue guardando como fecha (fecha_entrega), pero
// por defecto arranca en hoy + 10 días. Al editar un pedido ya existente, este default
// NO se vuelve a aplicar: se usa la fecha ya guardada, para no correr la entrega sin querer.
const fechaEntregaPorDefecto = () => {
  const d = new Date()
  d.setDate(d.getDate() + 10)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const crearFormVacio = () => ({
  codigo_base: '', ruc: '', nombre_cliente: '', vendedor: '', fecha_entrega: fechaEntregaPorDefecto(),
  direccion_entrega: '', numero_contacto: '', email_cliente: '', telefono_cliente: '',
  incluye_igv: false, forma_pago: '50% adelantado y 50% contra entrega',
  validez_oferta: '10 días de aprobado el diseño o según mutuo acuerdo',
  observaciones_pedido: '', imagen_url: ''
})

const ITEM_VACIO = {
  descripcion: '', medidas: '', cantidad: '', moneda: 'Soles', tipo_trabajo: '',
  precio_unitario: '', unidad_precio: 'kg', cantidad_precio: '',
  tiene_clisse: false, cantidad_colores: '', precio_clisse: ''
}

const ETIQUETA_CANTIDAD_PRECIO = { millares: 'Millares', unidades: 'Unidades', rollos: 'Rollos' }

function FormularioPedido({ onCreada, duplicarDesde, editando, onCancelarEdicion }) {
  const TODOS_LOS_PROCESOS = ['Extrusión', 'Laminado', 'Pegado', 'Impresión', 'Sellado', 'Corte']

  const borradorGuardado = cargarFiltros(CLAVE_BORRADOR_PEDIDO, {
    form: crearFormVacio(), items: [], itemActual: ITEM_VACIO, procesosItemActual: []
  })

  const [form, setForm] = useState(borradorGuardado.form)
  const [items, setItems] = useState(borradorGuardado.items)
  const [itemActual, setItemActual] = useState(borradorGuardado.itemActual)
  const [procesosItemActual, setProcesosItemActual] = useState(borradorGuardado.procesosItemActual)
  const [editandoId, setEditandoId] = useState(null)
  const [editandoItemIndex, setEditandoItemIndex] = useState(null)

  // Guarda automáticamente lo que llevas escrito, para que no se pierda si cambias de pestaña,
  // cierras el navegador o recargas por accidente. El borrador de una edición vive en una llave
  // aparte, identificada por el ID de ese pedido, así nunca se mezcla con el borrador de
  // "Nuevo Pedido" (el mismo problema que se corrigió antes en Cotizaciones).
  useEffect(() => {
    if (editandoId) {
      guardarFiltros(CLAVE_BORRADOR_EDICION_PEDIDO, {
        id: editandoId, form: { ...form, imagen_url: '' }, items, itemActual, procesosItemActual
      })
    } else {
      guardarFiltros(CLAVE_BORRADOR_PEDIDO, {
        form: { ...form, imagen_url: '' }, items, itemActual, procesosItemActual
      })
    }
  }, [form, items, itemActual, procesosItemActual, editandoId])

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

  const [sugerenciasClientes, setSugerenciasClientes] = useState([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [sugerenciasVendedores, setSugerenciasVendedores] = useState([])

  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const [exito, setExito] = useState(false)

  const manejarCambio = (e) => setForm({ ...form, [e.target.name]: e.target.value })
  const manejarCambioItem = (e) => setItemActual({ ...itemActual, [e.target.name]: e.target.value })

  const manejarImagenSubida = (e) => {
    const archivo = e.target.files[0]
    if (!archivo) return
    const lector = new FileReader()
    lector.onload = () => setForm((actual) => ({ ...actual, imagen_url: lector.result }))
    lector.readAsDataURL(archivo)
  }

  useEffect(() => {
    if (duplicarDesde) {
      setForm({
        codigo_base: '',
        ruc: duplicarDesde.ruc || '',
        nombre_cliente: duplicarDesde.cliente || '',
        vendedor: duplicarDesde.vendedor || '',
        fecha_entrega: '',
        direccion_entrega: duplicarDesde.direccion_entrega || '',
        numero_contacto: duplicarDesde.numero_contacto || '',
        email_cliente: duplicarDesde.email_cliente || '',
        telefono_cliente: duplicarDesde.telefono_cliente || '',
        incluye_igv: duplicarDesde.incluye_igv || false,
        forma_pago: duplicarDesde.forma_pago || '50% adelantado y 50% contra entrega',
        validez_oferta: duplicarDesde.validez_oferta || '10 días',
        observaciones_pedido: duplicarDesde.observaciones_pedido || '',
        imagen_url: ''
      })
      setItems(
        (duplicarDesde.items || []).map((it) => ({
          descripcion: it.descripcion || '',
          medidas: it.medidas || '',
          cantidad: it.cantidad || '',
          moneda: it.moneda || 'Soles',
          tipo_trabajo: it.tipo_trabajo || '',
          precio_unitario: it.precio_unitario || '',
          unidad_precio: it.unidad_precio || 'kg',
          cantidad_precio: it.cantidad_precio || '',
          procesos_plan: it.procesos_plan || null,
          tiene_clisse: it.tiene_clisse || false,
          cantidad_colores: it.cantidad_colores || '',
          precio_clisse: it.precio_clisse || ''
        }))
      )
      setItemActual({ ...ITEM_VACIO })
      setProcesosItemActual([])
      setEditandoItemIndex(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [duplicarDesde])

  useEffect(() => {
    if (editando) {
      setEditandoId(editando.id)

      // Si hay un borrador guardado de una sesión anterior de edición sobre ESTE MISMO
      // pedido (por ID), se recupera tal cual quedó, en vez de partir de los datos ya
      // guardados en el servidor — así no se pierde nada si el operador se salió a mitad
      // de editar (cambio de pestaña, recarga, cierre accidental del navegador).
      let borradorEdicion = null
      try {
        const guardado = localStorage.getItem(CLAVE_BORRADOR_EDICION_PEDIDO)
        if (guardado) {
          const parseado = JSON.parse(guardado)
          if (parseado?.id === editando.id) borradorEdicion = parseado
        }
      } catch {
        // borrador corrupto o localStorage no disponible: se ignora y se usa el servidor
      }

      if (borradorEdicion) {
        setForm(borradorEdicion.form)
        setItems(borradorEdicion.items)
        setItemActual(borradorEdicion.itemActual)
        setProcesosItemActual(borradorEdicion.procesosItemActual)
      } else {
        setForm({
          codigo_base: editando.codigo_base || '',
          ruc: editando.ruc || '',
          nombre_cliente: editando.cliente || '',
          vendedor: editando.vendedor || '',
          fecha_entrega: editando.fecha_entrega || '',
          direccion_entrega: editando.direccion_entrega || '',
          numero_contacto: editando.numero_contacto || '',
          email_cliente: editando.email_cliente || '',
          telefono_cliente: editando.telefono_cliente || '',
          incluye_igv: editando.incluye_igv || false,
          forma_pago: editando.forma_pago || '',
          validez_oferta: editando.validez_oferta || '',
          observaciones_pedido: editando.observaciones_pedido || '',
          imagen_url: editando.imagen_url || ''
        })
        setItems(
          (editando.items || []).map((it) => ({
            descripcion: it.descripcion || '',
            medidas: it.medidas || '',
            cantidad: it.cantidad || '',
            moneda: it.moneda || 'Soles',
            tipo_trabajo: it.tipo_trabajo || '',
            precio_unitario: it.precio_unitario || '',
            unidad_precio: it.unidad_precio || 'kg',
            cantidad_precio: it.cantidad_precio || '',
            procesos_plan: it.procesos_plan || null,
            tiene_clisse: it.tiene_clisse || false,
            cantidad_colores: it.cantidad_colores || '',
            precio_clisse: it.precio_clisse || ''
          }))
        )
        setItemActual({ ...ITEM_VACIO })
        setProcesosItemActual([])
      }

      setEditandoItemIndex(null)
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
    // Ruta relativa: api.js ya define baseURL con el dominio del backend.
    const t = setTimeout(() => {
      axios.get(`/clientes/buscar?q=${query}`)
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
      axios.get(`/ordenes-produccion/vendedores/buscar?q=${form.vendedor}`)
        .then((res) => setSugerenciasVendedores(res.data))
        .catch((err) => console.error(err))
    }, 300)
    return () => clearTimeout(t)
  }, [form.vendedor])

  const estimarCosto = (it) => {
    const precio = parseFloat(it.precio_unitario)
    if (!precio) return null
    const base = it.unidad_precio !== 'kg' ? parseFloat(it.cantidad_precio) : parseFloat(it.cantidad)
    if (!base) return null
    return precio * base
  }

  const costoEstimadoActual = estimarCosto(itemActual)

  const agregarItem = () => {
    if (!itemActual.cantidad) {
      setError('Indica la cantidad (Kg) del ítem antes de agregarlo.')
      return
    }
    if (itemActual.unidad_precio !== 'kg' && !itemActual.cantidad_precio) {
      setError(`Indica la cantidad de ${ETIQUETA_CANTIDAD_PRECIO[itemActual.unidad_precio]} para este ítem.`)
      return
    }
    setError(null)
    const itemFinal = { ...itemActual, procesos_plan: procesosItemActual.join(',') || null }
    if (editandoItemIndex !== null) {
      setItems((actual) => actual.map((it, i) => (i === editandoItemIndex ? itemFinal : it)))
      setEditandoItemIndex(null)
    } else {
      setItems((actual) => [...actual, itemFinal])
    }
    setItemActual({ ...ITEM_VACIO })
    setProcesosItemActual([])
  }

  const editarItem = (index) => {
    const it = items[index]
    setItemActual({ ...ITEM_VACIO, ...it })
    setProcesosItemActual(it.procesos_plan ? it.procesos_plan.split(',').filter(Boolean) : [])
    setEditandoItemIndex(index)
    setError(null)
  }

  const cancelarEdicionItem = () => {
    setItemActual({ ...ITEM_VACIO })
    setProcesosItemActual([])
    setEditandoItemIndex(null)
    setError(null)
  }

  const quitarItem = (index) => {
    setItems((actual) => actual.filter((_, i) => i !== index))
    if (editandoItemIndex === index) cancelarEdicionItem()
    else if (editandoItemIndex !== null && index < editandoItemIndex) setEditandoItemIndex((i) => i - 1)
  }

  const limpiarTodo = () => {
    if (!confirm('¿Limpiar todos los campos de este formulario? Se perderá lo que no hayas guardado (se mantienen Forma de pago, Tiempo de entrega y Validez de la oferta).')) return
    try { localStorage.removeItem(CLAVE_BORRADOR_EDICION_PEDIDO) } catch { /* no crítico */ }
    setForm(crearFormVacio())
    setItems([])
    setItemActual({ ...ITEM_VACIO })
    setProcesosItemActual([])
    setClienteSeleccionado(null)
    setEditandoItemIndex(null)
    setError(null)
    setExito(false)
    if (editandoId) {
      setEditandoId(null)
      if (onCancelarEdicion) onCancelarEdicion()
    }
  }

  const manejarEnvio = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    setExito(false)

    let itemsFinal = [...items]
    if (itemActual.cantidad || itemActual.descripcion) {
      if (itemActual.unidad_precio !== 'kg' && !itemActual.cantidad_precio) {
        setError(`Indica la cantidad de ${ETIQUETA_CANTIDAD_PRECIO[itemActual.unidad_precio]} para el último ítem.`)
        setEnviando(false)
        return
      }
      itemsFinal.push({ ...itemActual, procesos_plan: procesosItemActual.join(',') || null })
    }

    if (itemsFinal.length === 0) {
      setError('Agrega al menos un ítem al pedido.')
      setEnviando(false)
      return
    }

    const indiceSinPeso = itemsFinal.findIndex((it) => !it.cantidad || isNaN(parseFloat(it.cantidad)))
    if (indiceSinPeso !== -1) {
      setError(`Indica el peso (Kg) del ítem ${indiceSinPeso + 1} antes de guardar.`)
      setEnviando(false)
      return
    }

    const itemsPayload = itemsFinal.map((it) => ({
      descripcion: it.descripcion || null,
      medidas: it.medidas || null,
      cantidad: parseFloat(it.cantidad),
      tipo_trabajo: it.tipo_trabajo || null,
      procesos_plan: it.procesos_plan || null,
      moneda: it.moneda || null,
      precio_unitario: it.precio_unitario ? parseFloat(it.precio_unitario) : null,
      unidad_precio: it.unidad_precio || null,
      cantidad_precio: it.cantidad_precio ? parseFloat(it.cantidad_precio) : null,
      tiene_clisse: !!it.tiene_clisse,
      cantidad_colores: it.tiene_clisse && it.cantidad_colores ? parseInt(it.cantidad_colores) : null,
      precio_clisse: it.tiene_clisse && it.precio_clisse ? parseFloat(it.precio_clisse) : null
    }))

    const payloadComun = {
      ruc: form.ruc || null,
      nombre_cliente: form.nombre_cliente,
      vendedor: form.vendedor || null,
      fecha_entrega: form.fecha_entrega || null,
      direccion_entrega: form.direccion_entrega || null,
      numero_contacto: form.numero_contacto || null,
      email_cliente: form.email_cliente || null,
      telefono_cliente: form.telefono_cliente || null,
      incluye_igv: form.incluye_igv,
      forma_pago: form.forma_pago || null,
      validez_oferta: form.validez_oferta || null,
      observaciones_pedido: form.observaciones_pedido || null,
      imagen_url: form.imagen_url || null
    }

    try {
      if (editandoId) {
        await axios.put(`/pedidos/${editandoId}`, {
          ...payloadComun,
          items: itemsPayload
        })
      } else {
        await axios.post('/pedidos', {
          codigo_base: form.codigo_base,
          ...payloadComun,
          items: itemsPayload
        })
      }

      // Se guardó con éxito: el borrador de esta edición ya no hace falta.
      try { localStorage.removeItem(CLAVE_BORRADOR_EDICION_PEDIDO) } catch { /* no crítico */ }

      setExito(true)
      setForm(crearFormVacio())
      setItems([])
      setItemActual({ ...ITEM_VACIO })
      setProcesosItemActual([])
      setClienteSeleccionado(null)
      setEditandoItemIndex(null)
      setEditandoId(null)
      if (onCreada) onCreada()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al guardar el Pedido.')
    } finally {
      setEnviando(false)
    }
  }

  const estilo = "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h2 className="text-xl font-bold text-slate-800">{editandoId ? 'Editar Pedido' : 'Nuevo Pedido'}</h2>
        <button
          type="button"
          onClick={limpiarTodo}
          className="shrink-0 text-xs font-semibold text-red-600 border border-red-200 bg-red-50 rounded-lg px-3 py-1.5 hover:bg-red-100"
        >
          🗑 Limpiar todo
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        {editandoId ? 'Modifica los datos y guarda los cambios.' : 'Completa los datos y agrega los productos del pedido.'}
      </p>

      <form onSubmit={manejarEnvio} className="space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Datos del pedido</p>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">N° de Pedido</label>
          <input
            type="text" name="codigo_base" value={form.codigo_base} onChange={manejarCambio}
            required disabled={!!editandoId}
            className={`${estilo} ${editandoId ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`}
            placeholder="OP-118"
          />
          {editandoId && <p className="text-xs text-slate-400 mt-1">El número de pedido no se puede cambiar al editar.</p>}
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
              autoComplete="off" required className={estilo} placeholder="Drocsa"
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

        <div className="relative">
          <label className="block text-sm font-medium text-slate-600 mb-1">Vendedor</label>
          <input
            type="text" name="vendedor" value={form.vendedor} onChange={manejarCambio}
            autoComplete="off" required className={estilo} placeholder="Tu nombre, ej. Fernanda"
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

        <details className="text-sm">
          <summary className="cursor-pointer text-slate-500 hover:text-slate-700 font-medium">
            + Datos opcionales (dirección, contacto)
          </summary>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Dirección de entrega</label>
              <input type="text" name="direccion_entrega" value={form.direccion_entrega} onChange={manejarCambio} className={estilo} placeholder="Av. Ejemplo 123, Lima" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">N° de contacto</label>
              <input type="text" name="numero_contacto" value={form.numero_contacto} onChange={manejarCambio} className={estilo} placeholder="987654321" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Email del cliente</label>
              <input type="email" name="email_cliente" value={form.email_cliente} onChange={manejarCambio} className={estilo} placeholder="cliente@empresa.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Teléfono del cliente</label>
              <input type="text" name="telefono_cliente" value={form.telefono_cliente} onChange={manejarCambio} className={estilo} placeholder="01-2345678" />
            </div>
          </div>
        </details>

        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">IGV e imagen</p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, incluye_igv: true })}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                form.incluye_igv ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}
            >
              Con IGV
            </button>
            <button
              type="button"
              onClick={() => setForm({ ...form, incluye_igv: false })}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                !form.incluye_igv ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}
            >
              Sin IGV
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Imagen del pedido</label>
            <input type="file" accept="image/*" onChange={manejarImagenSubida} className="text-sm" />
            {form.imagen_url && (
              <img src={form.imagen_url} alt="Vista previa" className="mt-2 h-24 rounded-lg border border-slate-200" />
            )}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Ítems / trabajos del pedido ({items.length + (editandoItemIndex !== null ? 0 : 1)})
          </p>

          {items.length > 0 && (
            <div className="space-y-1.5 mb-4">
              {items.map((it, index) => (
                <div key={index} className="flex items-start justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm">
                  <div className="text-blue-900">
                    <p>
                      <span className="font-medium">{it.descripcion || 'Sin descripción'}</span>
                      {it.cantidad ? (
                        <>{' · '}{it.cantidad} Kg{it.procesos_plan ? ` · ${it.procesos_plan.split(',').join(' → ')}` : ''}</>
                      ) : (
                        <span className="text-red-600 font-semibold"> · ⚠ Falta indicar el peso (Kg)</span>
                      )}
                    </p>
                    {it.tiene_clisse && (
                      <p className="text-xs text-purple-700">
                        Clisse · {it.cantidad_colores || '-'} colores · {it.moneda === 'Dólares' ? '$' : 'S/'} {it.precio_clisse || '0.00'}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <button type="button" onClick={() => editarItem(index)} className="text-blue-600 text-xs font-medium hover:text-blue-800">
                      Editar
                    </button>
                    <button type="button" onClick={() => quitarItem(index)} className="text-red-500 text-xs font-medium hover:text-red-700">
                      Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-slate-700 text-sm">
              {editandoItemIndex !== null ? 'Editando producto de la lista' : 'Agregar producto al pedido'}
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Producto / Descripción</label>
              <input type="text" name="descripcion" value={itemActual.descripcion} onChange={manejarCambioItem} className={estilo} placeholder="Manga PEBD (bobinas de 50 kg)" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Medidas</label>
              <input type="text" name="medidas" value={itemActual.medidas} onChange={manejarCambioItem} className={estilo} placeholder="Ej. 30x40 cm, calibre 2 (opcional)" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Cantidad (Kg)</label>
                <input type="number" step="0.01" name="cantidad" value={itemActual.cantidad} onChange={manejarCambioItem} className={estilo} placeholder="Ej. 50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Moneda</label>
                <select name="moneda" value={itemActual.moneda} onChange={manejarCambioItem} className={estilo}>
                  <option value="Soles">Soles</option>
                  <option value="Dólares">Dólares</option>
                </select>
              </div>
            </div>

            <div className={`grid grid-cols-1 ${itemActual.unidad_precio !== 'kg' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-4`}>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Precio unitario</label>
                <input type="number" step="0.01" name="precio_unitario" value={itemActual.precio_unitario} onChange={manejarCambioItem} className={estilo} placeholder="Ej. 8.50" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Precio por</label>
                <select name="unidad_precio" value={itemActual.unidad_precio} onChange={manejarCambioItem} className={estilo}>
                  <option value="kg">Kg</option>
                  <option value="millares">Millares</option>
                  <option value="unidades">Unidades</option>
                  <option value="rollos">Rollos</option>
                </select>
              </div>
              {itemActual.unidad_precio !== 'kg' && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">{ETIQUETA_CANTIDAD_PRECIO[itemActual.unidad_precio]}</label>
                  <input type="number" step="0.01" name="cantidad_precio" value={itemActual.cantidad_precio} onChange={manejarCambioItem} className={estilo} placeholder="Ej. 10" />
                </div>
              )}
            </div>
            {costoEstimadoActual != null && (
              <p className="text-sm text-slate-600">
                Costo estimado de este ítem: <span className="font-bold text-slate-800">{itemActual.moneda === 'Dólares' ? '$' : 'S/'} {costoEstimadoActual.toFixed(2)}</span>
              </p>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Tipo de trabajo</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setItemActual({ ...itemActual, tipo_trabajo: itemActual.tipo_trabajo === 'Venta' ? '' : 'Venta' })}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    itemActual.tipo_trabajo === 'Venta' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  Venta
                </button>
                <button
                  type="button"
                  onClick={() => setItemActual({ ...itemActual, tipo_trabajo: itemActual.tipo_trabajo === 'Servicio' ? '' : 'Servicio' })}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    itemActual.tipo_trabajo === 'Servicio' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  Servicio
                </button>
                <button
                  type="button"
                  onClick={() => setItemActual({ ...itemActual, tipo_trabajo: itemActual.tipo_trabajo === 'Reposición' ? '' : 'Reposición' })}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    itemActual.tipo_trabajo === 'Reposición' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  Reposición
                </button>
              </div>
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
                  onClick={() => setItemActual({ ...itemActual, tiene_clisse: false, cantidad_colores: '', precio_clisse: '' })}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    !itemActual.tiene_clisse ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                  }`}
                >
                  No
                </button>
              </div>

              {itemActual.tiene_clisse && (
                <div className="grid grid-cols-2 gap-3 bg-white border border-blue-100 rounded-lg p-3">
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
                      Precio del Clisse ({itemActual.moneda === 'Dólares' ? '$' : 'S/'})
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
              <label className="block text-sm font-medium text-slate-600 mb-2">Ruta de procesos</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {TODOS_LOS_PROCESOS.filter((p) => !procesosItemActual.includes(p)).map((proceso) => (
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
              {procesosItemActual.length > 0 && (
                <div className="space-y-1.5">
                  {procesosItemActual.map((proceso, index) => (
                    <div key={`${proceso}-${index}`} className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                      <span className="text-xs font-bold text-blue-700 bg-white rounded-full w-5 h-5 flex items-center justify-center border border-blue-300">
                        {index + 1}
                      </span>
                      <span className="flex-1 text-sm font-medium text-blue-800">{proceso}</span>
                      <button type="button" onClick={() => moverProceso(index, -1)} disabled={index === 0} className="text-blue-600 hover:text-blue-800 disabled:opacity-30 px-1">↑</button>
                      <button type="button" onClick={() => moverProceso(index, 1)} disabled={index === procesosItemActual.length - 1} className="text-blue-600 hover:text-blue-800 disabled:opacity-30 px-1">↓</button>
                      <button type="button" onClick={() => quitarProceso(index)} className="text-red-500 hover:text-red-700 px-1">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={agregarItem}
                className="flex-1 border-2 border-dashed border-blue-300 text-blue-700 rounded-lg py-2 text-sm font-medium hover:bg-blue-50"
              >
                {editandoItemIndex !== null ? 'Guardar cambios en este producto' : '+ Añadir otro trabajo al pedido'}
              </button>
              {editandoItemIndex !== null && (
                <button
                  type="button"
                  onClick={cancelarEdicionItem}
                  className="px-4 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 space-y-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Condiciones y observaciones</p>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Forma de pago</label>
            <input type="text" name="forma_pago" value={form.forma_pago} onChange={manejarCambio} className={estilo} placeholder="Ej. 50% adelantado y 50% contra entrega" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Tiempo de entrega</label>
            <input type="text" name="validez_oferta" value={form.validez_oferta} onChange={manejarCambio} className={estilo} placeholder="Ej. 10 días de aprobado el diseño o según mutuo acuerdo" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Fecha de Entrega Estimada</label>
            <input type="date" name="fecha_entrega" value={form.fecha_entrega} onChange={manejarCambio} required className={estilo} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Observaciones</label>
            <textarea
              name="observaciones_pedido"
              value={form.observaciones_pedido}
              onChange={manejarCambio}
              rows={2}
              className={estilo}
              placeholder="Cualquier detalle adicional del pedido"
            />
          </div>
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {exito && <p className="text-green-700 text-sm font-medium">Pedido guardado correctamente.</p>}

        <div className="flex gap-3">
          {editandoId && (
            <button
              type="button"
              onClick={() => {
                try { localStorage.removeItem(CLAVE_BORRADOR_EDICION_PEDIDO) } catch { /* no crítico */ }
                setEditandoId(null)
                setForm(crearFormVacio())
                setItems([])
                setItemActual({ ...ITEM_VACIO })
                setProcesosItemActual([])
                setClienteSeleccionado(null)
                setEditandoItemIndex(null)
                setError(null)
                setExito(false)
                if (onCancelarEdicion) onCancelarEdicion()
              }}
              className="flex-1 border border-slate-300 rounded-lg py-2.5 font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
          )}
          <button type="submit" disabled={enviando} className="flex-1 bg-green-700 text-white rounded-lg py-2.5 font-medium hover:bg-green-800 disabled:opacity-50">
            {enviando ? 'Guardando...' : editandoId ? 'Guardar Cambios' : 'Registrar Pedido'}
          </button>
        </div>
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
    axios.get('/ordenes-produccion/seguimiento/listar')
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
        <VistaPedido orden={vistaAbierta} onCerrar={() => setVistaAbierta(null)} />
      )}
    </div>
  )
}

function Pedidos() {
  const [vista, setVista] = useState('preaprobadas')
  const [ordenes, setOrdenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [aprobando, setAprobando] = useState(null)
  const [duplicarDesde, setDuplicarDesde] = useState(null)
  const [editando, setEditando] = useState(null)
  const [vistaAbierta, setVistaAbierta] = useState(null)
  const vendedorOAdmin = esVendedorOMas()

  // Si venimos del botón "Pasar a Pedido" de Cotizaciones, precargamos ese borrador
  // reutilizando el mismo mecanismo de "duplicar" (misma forma de datos).
  useEffect(() => {
    try {
      const guardado = localStorage.getItem(CLAVE_COTIZACION_A_PEDIDO)
      if (guardado) {
        localStorage.removeItem(CLAVE_COTIZACION_A_PEDIDO)
        setEditando(null)
        setDuplicarDesde({ ...JSON.parse(guardado), timestamp: Date.now() })
        setVista('preaprobadas')
      }
    } catch { /* no crítico */ }
  }, [])

  const cargar = () => {
    setCargando(true)
    axios.get('/pedidos/preaprobados/listar')
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
    if (!confirm('¿Aprobar este pedido y enviar sus ítems a producción?')) return
    setAprobando(id)
    try {
      await axios.post(`/pedidos/${id}/aprobar`)
      cargar()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al aprobar el pedido.')
    } finally {
      setAprobando(null)
    }
  }

  const duplicar = (pedido) => {
    setEditando(null)
    setDuplicarDesde({ ...pedido, timestamp: Date.now() })
  }

  const manejarEditar = (pedido) => {
    setDuplicarDesde(null)
    setEditando({ ...pedido, timestamp: Date.now() })
  }

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar este pedido y todos sus ítems? Esta acción no se puede deshacer.')) return
    try {
      await axios.delete(`/pedidos/${id}`)
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
      {vendedorOAdmin && (
        <FormularioPedido
          onCreada={() => { cargar(); setEditando(null); setDuplicarDesde(null) }}
          duplicarDesde={duplicarDesde}
          editando={editando}
          onCancelarEdicion={() => setEditando(null)}
        />
      )}

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
                  <th className="px-4 py-3">Ítems</th>
                  <th className="px-4 py-3">Fecha entrega</th>
                  {vendedorOAdmin && <th className="px-4 py-3">Total</th>}
                  <th className="px-4 py-3">Vendedor</th>
                  {vendedorOAdmin && <th className="px-4 py-3 text-right"></th>}
                  {vendedorOAdmin && <th className="px-4 py-3 text-right"></th>}
                </tr>
              </thead>
              <tbody>
                {ordenes.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setVistaAbierta(p)}
                    className="border-t border-slate-100 cursor-pointer hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{p.codigo_base}</td>
                    <td className="px-4 py-3">{p.cliente}</td>
                    <td className="px-4 py-3">{p.items.length} ítem{p.items.length !== 1 ? 's' : ''}</td>
                    <td className="px-4 py-3">{formatearFecha(p.fecha_entrega)}</td>
                    {vendedorOAdmin && (
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {p.costo_total ? `${p.items[0]?.moneda === 'Dólares' ? '$' : 'S/'} ${p.costo_total.toFixed(2)}` : '—'}
                      </td>
                    )}
                    <td className="px-4 py-3">{p.vendedor}</td>
                    {vendedorOAdmin && (
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => aprobar(p.id)}
                          disabled={aprobando === p.id}
                          className="bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-green-800 disabled:opacity-50"
                        >
                          {aprobando === p.id ? 'Aprobando...' : '✓ Aprobar'}
                        </button>
                      </td>
                    )}
                    {vendedorOAdmin && (
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <MenuAcciones
                          onEditar={() => manejarEditar(p)}
                          onDuplicar={() => duplicar(p)}
                          onEliminar={() => eliminar(p.id)}
                        />
                      </td>
                    )}
                  </tr>
                ))}
                {ordenes.length === 0 && (
                  <tr>
                    <td colSpan={vendedorOAdmin ? 8 : 5} className="px-4 py-6 text-center text-slate-400">
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
        <VistaPedido orden={vistaAbierta} onCerrar={() => setVistaAbierta(null)} />
      )}
    </div>
  )
}

export default Pedidos