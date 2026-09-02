import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import axios from './api'
import CrearOrden from './CrearOrden'
import Movimientos from './Movimientos'
import OrdenDetalle from './OrdenDetalle'
import Clientes from './Clientes'
import Operarios from './Operarios'
import Aglomerado from './Aglomerado'
import Reportes from './Reportes'
import Cotizaciones from './Cotizaciones'
import MenuAcciones from './MenuAcciones'
import FiltroDesplegable from './FiltroDesplegable'
import Login from './Login'
import ModalEditar from './ModalEditar'
import { PERIODOS_RAPIDOS, cargarFiltros, guardarFiltros } from './filtrosPersistentes'
import { generarPDFOrdenes } from './GenerarPDFRegistros'

const CLAVE_FILTROS_ORDENES = 'packtech_filtros_ordenes'
const ESTADOS_OP = ['Pendiente', 'En proceso', 'En almacén', 'Terminado']

function Ordenes() {
  const filtrosGuardados = cargarFiltros(CLAVE_FILTROS_ORDENES, {
    codigo: '', cliente: '', producto: '', estado: '', periodo: 'todo', desde: '', hasta: ''
  })

  const [ordenes, setOrdenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const navegar = useNavigate()
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [duplicarDesde, setDuplicarDesde] = useState(null)
  const [filtroCliente, setFiltroCliente] = useState(filtrosGuardados.cliente)
  const [filtroProducto, setFiltroProducto] = useState(filtrosGuardados.producto)
  const [filtroEstado, setFiltroEstado] = useState(filtrosGuardados.estado)
  const [periodo, setPeriodo] = useState(filtrosGuardados.periodo)
  const [fechaDesde, setFechaDesde] = useState(filtrosGuardados.desde)
  const [fechaHasta, setFechaHasta] = useState(filtrosGuardados.hasta)
  const [filtroCodigo, setFiltroCodigo] = useState(filtrosGuardados.codigo)
  const rol = localStorage.getItem('packtech_rol')

  const [hayMasOrdenes, setHayMasOrdenes] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [descargandoPDF, setDescargandoPDF] = useState(false)

  const rangoPeriodo = () => {
    if (periodo === 'custom') return { desde: fechaDesde, hasta: fechaHasta }
    const p = PERIODOS_RAPIDOS.find((x) => x.id === periodo) || PERIODOS_RAPIDOS[0]
    return { desde: p.desde(), hasta: p.hasta() }
  }

  const paramsFiltro = () => {
    const { desde, hasta } = rangoPeriodo()
    return {
      q: filtroCodigo.trim() || filtroCliente.trim() || undefined,
      producto: filtroProducto.trim() || undefined,
      estado: filtroEstado || undefined,
      fecha_desde: desde || undefined,
      fecha_hasta: hasta || undefined
    }
  }

  // Persiste los filtros para que sobrevivan cambios de pestaña y recargas de página
  useEffect(() => {
    guardarFiltros(CLAVE_FILTROS_ORDENES, {
      codigo: filtroCodigo, cliente: filtroCliente, producto: filtroProducto,
      estado: filtroEstado, periodo, desde: fechaDesde, hasta: fechaHasta
    })
  }, [filtroCodigo, filtroCliente, filtroProducto, filtroEstado, periodo, fechaDesde, fechaHasta])

  const cargarOrdenes = () => {
    setCargando(true)
    axios.get('https://packtech-production.up.railway.app/ordenes-produccion/filtrar', {
      params: { ...paramsFiltro(), limit: 20 }
    })
      .then((respuesta) => {
        setOrdenes(respuesta.data)
        setHayMasOrdenes(respuesta.data.length === 20)
        setError(null)
      })
      .catch((err) => {
        console.error(err)
        setError('No se pudo conectar con el backend.')
      })
      .finally(() => setCargando(false))
  }

  const cargarMasOrdenes = () => {
    if (ordenes.length === 0) return
    setCargandoMas(true)
    const ultimoId = ordenes[ordenes.length - 1].id
    axios.get('https://packtech-production.up.railway.app/ordenes-produccion/filtrar', {
      params: { ...paramsFiltro(), limit: 20, antes_de: ultimoId }
    })
      .then((respuesta) => {
        setOrdenes((actual) => [...actual, ...respuesta.data])
        setHayMasOrdenes(respuesta.data.length === 20)
      })
      .catch((err) => console.error(err))
      .finally(() => setCargandoMas(false))
  }

  const descargarOrdenesPDF = async () => {
    setDescargandoPDF(true)
    try {
      let todas = []
      let antesDe = undefined
      while (true) {
        const respuesta = await axios.get('https://packtech-production.up.railway.app/ordenes-produccion/filtrar', {
          params: { ...paramsFiltro(), limit: 200, antes_de: antesDe }
        })
        todas = [...todas, ...respuesta.data]
        if (respuesta.data.length < 200) break
        antesDe = respuesta.data[respuesta.data.length - 1].id
      }

      if (todas.length === 0) {
        alert('No hay órdenes que coincidan con los filtros para descargar.')
        return
      }

      const p = PERIODOS_RAPIDOS.find((x) => x.id === periodo) || PERIODOS_RAPIDOS[0]
      const { desde, hasta } = rangoPeriodo()

      generarPDFOrdenes(todas, {
        periodoLabel: periodo === 'custom' ? 'Personalizado' : p.label,
        desde,
        hasta,
        filtros: {
          codigo: filtroCodigo, cliente: filtroCliente, producto: filtroProducto, estado: filtroEstado
        }
      })
    } catch (err) {
      console.error(err)
      alert('No se pudo generar el PDF de órdenes.')
    } finally {
      setDescargandoPDF(false)
    }
  }

  // Recarga desde el backend cada vez que cambia cualquier filtro (con pequeño debounce en texto libre)
  useEffect(() => {
    const t = setTimeout(() => {
      cargarOrdenes()
    }, 300)
    return () => clearTimeout(t)
  }, [filtroCodigo, filtroCliente, filtroProducto, filtroEstado, periodo, fechaDesde, fechaHasta])

  const eliminarOrden = async (id) => {
    if (!confirm('¿Seguro que quieres eliminar esta orden? Se borrarán también todos sus movimientos.')) return
    try {
      await axios.delete(`https://packtech-production.up.railway.app/ordenes-produccion/${id}`)
      cargarOrdenes()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al eliminar la orden.')
    }
  }

  const formatearFecha = (fecha) => {
  if (!fecha) return ''
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)}`
  }

  const duplicarOrden = (orden) => {
  setDuplicarDesde({ ...orden, timestamp: Date.now() })
  window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const abrirEdicion = (orden) => {
  setEditando({
    id: orden.id,
    codigo: orden.codigo,
    ruc: orden.ruc,
    nombre_cliente: orden.cliente,
    numero_std: orden.numero_std,
    descripcion: orden.descripcion || '',
    cantidad: orden.cantidad,
    unidad: orden.unidad,
    observaciones: orden.observaciones || '',
    estado: orden.estado
  })
}

const guardarEdicion = async () => {
  setGuardando(true)
  try {
    await axios.put(`https://packtech-production.up.railway.app/ordenes-produccion/${editando.id}`, {
      codigo: editando.codigo,
      ruc: editando.ruc,
      nombre_cliente: editando.nombre_cliente,
      numero_std: parseInt(editando.numero_std),
      descripcion: editando.descripcion,
      cantidad: parseFloat(editando.cantidad),
      unidad: editando.unidad,
      observaciones: editando.observaciones || null,
      estado: editando.estado
    })

    setEditando(null)
    cargarOrdenes()
  } catch (err) {
    alert(err.response?.data?.detail || 'Error al editar la orden.')
  } finally {
    setGuardando(false)
  }
}

  const hayFiltrosActivos = filtroCodigo || filtroCliente || filtroProducto || filtroEstado || periodo !== 'todo'

  const limpiarFiltros = () => {
    setFiltroCodigo('')
    setFiltroCliente('')
    setFiltroProducto('')
    setFiltroEstado('')
    setPeriodo('todo')
    setFechaDesde('')
    setFechaHasta('')
  }

  return (
  <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Órdenes de Producción</h1>
        <p className="text-slate-500 text-sm mt-1">Crea, filtra y da seguimiento a cada orden en planta.</p>
      </div>

      <CrearOrden onCreada={cargarOrdenes} duplicarDesde={duplicarDesde} />

      <div>
      {error && <p className="text-red-600 mb-3">{error}</p>}

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
                placeholder="Buscar N° Pedido..."
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-40 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
              />
              <input
                type="text"
                value={filtroCliente}
                onChange={(e) => setFiltroCliente(e.target.value)}
                placeholder="Buscar Cliente..."
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-40"
              />
              <input
                type="text"
                value={filtroProducto}
                onChange={(e) => setFiltroProducto(e.target.value)}
                placeholder="Buscar Producto..."
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-40"
              />
              <FiltroDesplegable
                etiqueta="Estado"
                opciones={ESTADOS_OP}
                seleccionado={filtroEstado || null}
                onSeleccionar={(v) => setFiltroEstado(v || '')}
              />
              {hayFiltrosActivos && (
                <button
                  onClick={limpiarFiltros}
                  className="text-sm text-slate-400 hover:text-slate-700 underline"
                >
                  Limpiar filtros
                </button>
              )}
              <button
                onClick={descargarOrdenesPDF}
                disabled={descargandoPDF || ordenes.length === 0}
                className="ml-auto text-sm bg-slate-800 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-slate-900 disabled:opacity-50 whitespace-nowrap"
              >
                {descargandoPDF ? 'Generando...' : `⬇ Descargar (${periodo === 'custom' ? 'Personalizado' : (PERIODOS_RAPIDOS.find((p) => p.id === periodo)?.label || 'Todo')})`}
              </button>
            </div>
          </div>

      {cargando && ordenes.length === 0 ? (
        <p className="text-slate-500">Cargando...</p>
      ) : (
        <>
          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">N° Pedido</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Cantidad (Kg)</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Último Proceso</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Hora</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
              <tbody>
                {ordenes.map((orden) => (
                  <tr
                    key={orden.id}
                    onClick={() => navegar(`/ordenes/${orden.id}`)}
                    className="border-t border-slate-100 cursor-pointer hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{orden.codigo}</td>
                    <td className="px-4 py-3">{orden.cliente}</td>
                    <td className="px-4 py-3">{orden.descripcion}</td>
                    <td className="px-4 py-3">{orden.cantidad}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        orden.estado === 'Terminado' ? 'bg-green-100 text-green-700' :
                        orden.estado === 'En almacén' ? 'bg-blue-100 text-blue-700' :
                        orden.estado === 'En proceso' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {orden.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">{orden.ultimo_proceso}</td>
                    <td className="px-4 py-3">{formatearFecha(orden.fecha)}</td>
                    <td className="px-4 py-3">{orden.hora?.slice(0, 5)}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <MenuAcciones
                        onEditar={() => abrirEdicion(orden)}
                        onDuplicar={() => duplicarOrden(orden)}
                        onEliminar={() => eliminarOrden(orden.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {ordenes.length === 0 && !cargando && (
              <p className="text-slate-400 text-center py-8">Ninguna orden coincide con los filtros aplicados.</p>
            )}

            {hayMasOrdenes && ordenes.length > 0 && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={cargarMasOrdenes}
                  disabled={cargandoMas}
                  className="text-sm text-slate-600 border border-slate-300 rounded-lg px-4 py-2 hover:bg-slate-50 disabled:opacity-50"
                >
                  {cargandoMas ? 'Cargando...' : 'Cargar más órdenes'}
                </button>
              </div>
            )}
        </>
      )}
    </div>

      {editando && (
        <ModalEditar
          titulo="Editar Orden de Producción"
          campos={[
            { name: 'codigo', label: 'N° Pedido' },
            { name: 'ruc', label: 'RUC del Cliente' },
            { name: 'nombre_cliente', label: 'Cliente' },
            { name: 'numero_std', label: 'Número Estándar', type: 'number' },
            { name: 'descripcion', label: 'Producto' },
            { name: 'cantidad', label: 'Cantidad (Kg)', type: 'number' },
            { name: 'observaciones', label: 'Observaciones' },
            { name: 'estado', label: 'Estado', type: 'select', opciones: [...new Set([...ESTADOS_OP, editando.estado].filter(Boolean))] }
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

function App() {
  const [autenticado, setAutenticado] = useState(
    !!localStorage.getItem('packtech_clave')
  )

  const rol = localStorage.getItem('packtech_rol')

  if (!autenticado) {
    return <Login onIngresar={() => setAutenticado(true)} />
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <nav className="bg-slate-900 text-white px-4 sm:px-8 py-3 flex flex-wrap gap-x-3 gap-y-2 sm:gap-6 items-center shadow-md">
          <span className="font-bold text-lg tracking-tight w-full sm:w-auto">PackTech</span>
          <div className="hidden sm:block h-5 w-px bg-slate-700" />
        <span className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Producción</span>
        <Link to="/" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Órdenes</Link>
        <Link to="/movimientos" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Movimientos</Link>
        <Link to="/aglomerado" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Aglomerado</Link>

        <div className="hidden sm:block h-5 w-px bg-slate-700" />
        <span className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold w-full sm:w-auto">Ventas</span>
        {rol !== 'observador' && (
          <Link to="/cotizaciones" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Pedidos</Link>
        )}
        <Link to="/clientes" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Clientes</Link>

        <div className="hidden sm:block h-5 w-px bg-slate-700" />
        <span className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold w-full sm:w-auto">Gestión</span>
        <Link to="/operarios" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Operarios</Link>
        <Link to="/reportes" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Reportes</Link>
  
        <button
        onClick={() => {
          localStorage.removeItem('packtech_clave')
          localStorage.removeItem('packtech_rol')
          localStorage.removeItem('packtech_nombre')
          window.location.reload()
        }}
        className="ml-auto text-slate-300 hover:text-white text-sm"
      >
        Salir
      </button>
    </nav>
        <div className="p-4 sm:p-8">
          <Routes>
            <Route path="/" element={<Ordenes />} />
            <Route path="/movimientos" element={<Movimientos />} />
            <Route path="/ordenes/:id" element={<OrdenDetalle />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/operarios" element={<Operarios />} />
            <Route path="/aglomerado" element={<Aglomerado />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/cotizaciones" element={<Cotizaciones />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App