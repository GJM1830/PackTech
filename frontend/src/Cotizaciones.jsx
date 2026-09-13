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
          <label className="block text-sm font-medium text-slate-700 mb-1">Número de