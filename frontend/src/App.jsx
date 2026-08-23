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

function Ordenes() {
  const [ordenes, setOrdenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const navegar = useNavigate()
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [duplicarDesde, setDuplicarDesde] = useState(null)
  const [filtroCliente, setFiltroCliente] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState(null)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [filtroCodigo, setFiltroCodigo] = useState('')
  const rol = localStorage.getItem('packtech_rol')

  const [hayMasOrdenes, setHayMasOrdenes] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)

  const cargarOrdenes = () => {
    setCargando(true)
    axios.get('https://packtech-production.up.railway.app/ordenes-produccion?limit=20')
      .then((respuesta) => {
        setOrdenes(respuesta.data)
        setHayMasOrdenes(respuesta.data.length === 20)
        setCargando(false)
      })
      .catch((err) => {
        console.error(err)
        setError('No se pudo conectar con el backend.')
        setCargando(false)
      })
  }

  const cargarMasOrdenes = () => {
    if (ordenes.length === 0) return
    setCargandoMas(true)
    const ultimoId = ordenes[ordenes.length - 1].id
    axios.get(`https://packtech-production.up.railway.app/ordenes-produccion?limit=20&antes_de=${ultimoId}`)
      .then((respuesta) => {
        setOrdenes((actual) => [...actual, ...respuesta.data])
        setHayMasOrdenes(respuesta.data.length === 20)
      })
      .catch((err) => console.error(err))
      .finally(() => setCargandoMas(false))
  }

  useEffect(() => {
    cargarOrdenes()
  }, [])

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

  const clientesUnicos = [...new Set(ordenes.map(o => o.cliente))].sort()
  const estadosUnicos = [...new Set(ordenes.map(o => o.estado))].sort()

  const ordenesFiltradas = ordenes.filter((orden) => {
    if (filtroCodigo && !orden.codigo.toLowerCase().includes(filtroCodigo.toLowerCase())) return false
    if (filtroCliente && orden.cliente !== filtroCliente) return false
    if (filtroEstado && orden.estado !== filtroEstado) return false
    if (fechaDesde && orden.fecha < fechaDesde) return false
    if (fechaHasta && orden.fecha > fechaHasta) return false
    return true
  })

  return (
  <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Órdenes de Producción</h1>
        <p className="text-slate-500 text-sm mt-1">Crea, filtra y da seguimiento a cada orden en planta.</p>
      </div>

      <CrearOrden onCreada={cargarOrdenes} duplicarDesde={duplicarDesde} />

      <div>
      {cargando && <p className="text-slate-500">Cargando...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!cargando && !error && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <input
              type="text"
              value={filtroCodigo}
              onChange={(e) => setFiltroCodigo(e.target.value)}
              placeholder="Buscar N° Pedido..."
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-40 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
            />
            <FiltroDesplegable
              etiqueta="Cliente"
              opciones={clientesUnicos}
              seleccionado={filtroCliente}
              onSeleccionar={setFiltroCliente}
            />
            <FiltroDesplegable
              etiqueta="Estado"
              opciones={estadosUnicos}
              seleccionado={filtroEstado}
              onSeleccionar={setFiltroEstado}
            />
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
            {(filtroCodigo || filtroCliente || filtroEstado || fechaDesde || fechaHasta) && (
              <button
                onClick={() => { setFiltroCodigo(''); setFiltroCliente(null); setFiltroEstado(null); setFechaDesde(''); setFechaHasta('') }}
                className="text-sm text-slate-400 hover:text-slate-700 underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">N° Pedido</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">N° Std</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Cantidad</th>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Hora</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
              <tbody>
                {ordenesFiltradas.map((orden) => (
                  <tr
                    key={orden.id}
                    onClick={() => navegar(`/ordenes/${orden.id}`)}
                    className="border-t border-slate-100 cursor-pointer hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{orden.codigo}</td>
                    <td className="px-4 py-3">{orden.cliente}</td>
                    <td className="px-4 py-3">{orden.numero_std}</td>
                    <td className="px-4 py-3">{orden.descripcion}</td>
                    <td className="px-4 py-3">{orden.cantidad}</td>
                    <td className="px-4 py-3">{orden.unidad}</td>
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

            {hayMasOrdenes && (
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
            { name: 'nombre_cliente', label: 'Nombre del Cliente' },
            { name: 'numero_std', label: 'Número Estándar', type: 'number' },
            { name: 'descripcion', label: 'Producto' },
            { name: 'cantidad', label: 'Cantidad', type: 'number' },
            { name: 'unidad', label: 'Unidad' },
            { name: 'estado', label: 'Estado' }
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
        <nav className="bg-slate-900 text-white px-4 sm:px-8 py-4 flex flex-wrap gap-3 sm:gap-6 items-center shadow-md">
          <span className="font-bold text-lg tracking-tight">PackTech</span>
          <div className="h-5 w-px bg-slate-700" />
        <Link to="/" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Órdenes</Link>
        <Link to="/movimientos" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Movimientos</Link>
        <Link to="/clientes" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Clientes</Link>
        <Link to="/operarios" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Operarios</Link>
        <Link to="/aglomerado" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Aglomerado</Link>
        <Link to="/reportes" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Reportes</Link>
        {rol !== 'observador' && (
          <Link to="/cotizaciones" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Cotizaciones</Link>
        )}
  
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
        <div className="p-8">
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