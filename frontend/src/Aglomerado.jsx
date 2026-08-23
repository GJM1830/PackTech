import { useEffect, useState } from 'react'
import axios from './api'
import { puedeCrear } from './roles'
import MenuAcciones from './MenuAcciones'

const formatearFecha = (fecha) => {
  if (!fecha) return ''
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)}`
}

const PROCESOS = ['Extrusión', 'Laminado', 'Impresión', 'Sellado', 'Corte']

function Aglomerado() {
  const rol = localStorage.getItem('packtech_rol')
  const esAdmin = rol === 'admin'

  const [saldo, setSaldo] = useState(0)
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [tipo, setTipo] = useState('entrada')

  const [cantidad, setCantidad] = useState('')
  const [procesoOrigen, setProcesoOrigen] = useState('')
  const [productoOrigen, setProductoOrigen] = useState('')
  const [sugerenciasProducto, setSugerenciasProducto] = useState([])

  const [busquedaOrden, setBusquedaOrden] = useState('')
  const [sugerenciasOrdenes, setSugerenciasOrdenes] = useState([])
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null)

  const [clasificacion, setClasificacion] = useState('')
  const [sugerenciasClasificacion, setSugerenciasClasificacion] = useState([])

  const [busquedaOperario, setBusquedaOperario] = useState('')
  const [sugerenciasOperarios, setSugerenciasOperarios] = useState([])
  const [operarioSeleccionado, setOperarioSeleccionado] = useState(null)

  const [observacion, setObservacion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [errorForm, setErrorForm] = useState(null)

  const cargarDatos = async () => {
    setCargando(true)
    try {
      const [saldoRes, movRes] = await Promise.all([
        axios.get('https://packtech-production.up.railway.app/aglomerado/saldo'),
        axios.get('https://packtech-production.up.railway.app/aglomerado/movimientos')
      ])
      setSaldo(saldoRes.data.saldo)
      setMovimientos(movRes.data)
      setError(null)
    } catch (err) {
      console.error(err)
      setError('No se pudo conectar con el backend.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  useEffect(() => {
    if (productoOrigen.trim().length < 2) {
      setSugerenciasProducto([])
      return
    }
    const t = setTimeout(() => {
      axios.get(`https://packtech-production.up.railway.app/aglomerado/productos/buscar?q=${productoOrigen}`)
        .then((res) => setSugerenciasProducto(res.data))
        .catch((err) => console.error(err))
    }, 300)
    return () => clearTimeout(t)
  }, [productoOrigen])

  useEffect(() => {
    if (clasificacion.trim().length < 2) {
      setSugerenciasClasificacion([])
      return
    }
    const t = setTimeout(() => {
      axios.get(`https://packtech-production.up.railway.app/aglomerado/clasificaciones/buscar?q=${clasificacion}`)
        .then((res) => setSugerenciasClasificacion(res.data))
        .catch((err) => console.error(err))
    }, 300)
    return () => clearTimeout(t)
  }, [clasificacion])

  useEffect(() => {
    if (busquedaOrden.trim().length < 2 || ordenSeleccionada) {
      setSugerenciasOrdenes([])
      return
    }
    const t = setTimeout(() => {
      axios.get(`https://packtech-production.up.railway.app/ordenes-produccion/buscar?q=${busquedaOrden}`)
        .then((res) => setSugerenciasOrdenes(res.data))
        .catch((err) => console.error(err))
    }, 300)
    return () => clearTimeout(t)
  }, [busquedaOrden, ordenSeleccionada])

  useEffect(() => {
    if (busquedaOperario.trim().length < 2 || operarioSeleccionado) {
      setSugerenciasOperarios([])
      return
    }
    const t = setTimeout(() => {
      axios.get(`https://packtech-production.up.railway.app/operarios/buscar?q=${busquedaOperario}`)
        .then((res) => setSugerenciasOperarios(res.data))
        .catch((err) => console.error(err))
    }, 300)
    return () => clearTimeout(t)
  }, [busquedaOperario, operarioSeleccionado])

  const limpiarFormulario = () => {
    setCantidad('')
    setProcesoOrigen('')
    setProductoOrigen('')
    setBusquedaOrden('')
    setOrdenSeleccionada(null)
    setClasificacion('')
    setBusquedaOperario('')
    setOperarioSeleccionado(null)
    setObservacion('')
  }

  const manejarEnvio = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setErrorForm(null)

    const payload = {
      tipo,
      cantidad: parseFloat(cantidad) || 0,
      proceso_origen: tipo === 'entrada' ? procesoOrigen : null,
      producto_origen: tipo === 'entrada' ? (productoOrigen.trim() || null) : null,
      codigo_orden: tipo === 'salida' ? (busquedaOrden.trim() || null) : null,
      clasificacion: (tipo === 'salida' || tipo === 'entrada') ? (clasificacion.trim() || null) : null,
      nombre_operario: busquedaOperario.trim(),
      observacion: observacion || null
    }

    try {
      await axios.post('https://packtech-production.up.railway.app/aglomerado/movimientos', payload)
      limpiarFormulario()
      cargarDatos()
    } catch (err) {
      setErrorForm(err.response?.data?.detail || 'Error al registrar el movimiento.')
    } finally {
      setEnviando(false)
    }
  }

  const eliminarMovimiento = async (id) => {
    if (!confirm('¿Seguro que quieres eliminar este movimiento de aglomerado?')) return
    try {
      await axios.delete(`https://packtech-production.up.railway.app/aglomerado/movimientos/${id}`)
      cargarDatos()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al eliminar el movimiento.')
    }
  }

  const estiloInput =
    "w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Aglomerado</h1>
        <p className="text-slate-500 text-sm mt-1">Control tipo estado de cuenta: entradas de merma y salidas de aglomerado.</p>
      </div>

      <div className="bg-slate-900 text-white rounded-xl shadow-sm p-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Saldo actual</p>
          <p className="text-3xl font-bold mt-1">{Number(saldo).toFixed(2)} kg</p>
        </div>
        <div className="text-right text-xs text-slate-400">
          <p>Entradas suman</p>
          <p>Salidas restan</p>
          <p>Ajuste fija el saldo</p>
        </div>
      </div>

      {puedeCrear() && (
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Registrar Movimiento</h2>

        <div className="flex gap-2 mb-5">
          <button
            type="button"
            onClick={() => setTipo('entrada')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium border transition-colors ${
              tipo === 'entrada' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            }`}
          >
            + Entrada (merma)
          </button>
          <button
            type="button"
            onClick={() => setTipo('salida')}
            className={`flex-1 rounded-lg py-2 text-sm font-medium border transition-colors ${
              tipo === 'salida' ? 'bg-blue-700 text-white border-blue-700' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            }`}
          >
            − Salida (aglomerado)
          </button>
          {esAdmin && (
            <button
              type="button"
              onClick={() => setTipo('ajuste')}
              className={`flex-1 rounded-lg py-2 text-sm font-medium border transition-colors ${
                tipo === 'ajuste' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}
            >
              ⚙ Ajuste (admin)
            </button>
          )}
        </div>

        <form onSubmit={manejarEnvio} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              {tipo === 'ajuste' ? 'Cantidad real (kg)' : 'Cantidad (kg)'}
            </label>
            <input
              type="number"
              step="0.01"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              required
              className={estiloInput}
            />
          </div>

          {tipo === 'entrada' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Proceso de origen</label>
                <select
                  value={procesoOrigen}
                  onChange={(e) => setProcesoOrigen(e.target.value)}
                  required
                  className={estiloInput}
                >
                  <option value="">Seleccionar...</option>
                  {PROCESOS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-slate-600 mb-1">Producto / Descripción</label>
                <input
                  type="text"
                  value={productoOrigen}
                  onChange={(e) => setProductoOrigen(e.target.value)}
                  autoComplete="off"
                  required
                  className={estiloInput}
                  placeholder="Escribe o elige uno ya usado"
                />
                {sugerenciasProducto.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {sugerenciasProducto.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setProductoOrigen(p.nombre); setSugerenciasProducto([]) }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                      >
                        {p.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-slate-600 mb-1">Clasificación (opcional)</label>
                <input
                  type="text"
                  value={clasificacion}
                  onChange={(e) => setClasificacion(e.target.value)}
                  autoComplete="off"
                  className={estiloInput}
                  placeholder="Ej. Alta, Baja, Blanco..."
                />
                {sugerenciasClasificacion.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {sugerenciasClasificacion.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setClasificacion(c.nombre); setSugerenciasClasificacion([]) }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                      >
                        {c.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {tipo === 'salida' && (
            <>
              <div className="relative">
                <label className="block text-sm font-medium text-slate-600 mb-1">Orden destino (opcional)</label>
                <input
                  type="text"
                  value={busquedaOrden}
                  onChange={(e) => { setBusquedaOrden(e.target.value); setOrdenSeleccionada(null) }}
                  autoComplete="off"
                  className={estiloInput}
                  placeholder="Escribe el código (ej. OP-100)"
                />
                {sugerenciasOrdenes.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {sugerenciasOrdenes.map((orden) => (
                      <button
                        key={orden.id}
                        type="button"
                        onClick={() => {
                          setOrdenSeleccionada(orden)
                          setBusquedaOrden(orden.codigo)
                          setSugerenciasOrdenes([])
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 border-b border-slate-100 last:border-0"
                      >
                        <span className="font-medium text-slate-800">{orden.codigo}</span>
                        <span className="text-slate-400"> · {orden.cliente}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-slate-600 mb-1">Clasificación</label>
                <input
                  type="text"
                  value={clasificacion}
                  onChange={(e) => setClasificacion(e.target.value)}
                  autoComplete="off"
                  className={estiloInput}
                  placeholder="Ej. Alta, Baja, Blanco..."
                />
                {sugerenciasClasificacion.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                    {sugerenciasClasificacion.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setClasificacion(c.nombre); setSugerenciasClasificacion([]) }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                      >
                        {c.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {tipo === 'ajuste' && (
            <p className="text-sm text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
              Esto fija el saldo actual a la cantidad indicada (conteo físico). Queda registrado en el historial.
            </p>
          )}

          <div className="relative">
            <label className="block text-sm font-medium text-slate-600 mb-1">Operario</label>
            <input
              type="text"
              value={busquedaOperario}
              onChange={(e) => { setBusquedaOperario(e.target.value); setOperarioSeleccionado(null) }}
              autoComplete="off"
              required
              className={estiloInput}
              placeholder="Escribe un nombre"
            />
            {sugerenciasOperarios.length > 0 && (
              <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {sugerenciasOperarios.map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => {
                      setOperarioSeleccionado(op)
                      setBusquedaOperario(op.nombre)
                      setSugerenciasOperarios([])
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                  >
                    {op.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Observación</label>
            <input
              type="text"
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className={estiloInput}
              placeholder="Opcional"
            />
          </div>

          {errorForm && <p className="text-red-600 text-sm">{errorForm}</p>}

          <button
            type="submit"
            disabled={enviando}
            className={`w-full text-white rounded-lg py-2.5 font-medium transition-all disabled:opacity-50 ${
              tipo === 'salida' ? 'bg-blue-700 hover:bg-blue-800' : tipo === 'ajuste' ? 'bg-slate-800 hover:bg-slate-900' : 'bg-green-700 hover:bg-green-800'
            }`}
          >
            {enviando ? 'Guardando...' : 'Registrar'}
          </button>
        </form>
      </div>
      )}

      <div>
        {cargando && <p className="text-slate-500">Cargando...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!cargando && !error && (
          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Cantidad</th>
                  <th className="px-4 py-3">Proceso / Orden</th>
                  <th className="px-4 py-3">Detalle</th>
                  <th className="px-4 py-3">Operario</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Hora</th>
                  <th className="px-4 py-3">Origen</th>
                  <th className="px-4 py-3 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((mov) => (
                  <tr key={mov.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        mov.tipo === 'entrada' ? 'bg-green-100 text-green-700' :
                        mov.tipo === 'salida' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {mov.tipo === 'entrada' ? 'Entrada' : mov.tipo === 'salida' ? 'Salida' : 'Ajuste'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{mov.cantidad} kg</td>
                    <td className="px-4 py-3">
                      {mov.tipo === 'entrada' ? (mov.proceso_origen || '—') : (mov.codigo_orden || '—')}
                    </td>
                    <td className="px-4 py-3">
                      {mov.tipo === 'entrada' ? (mov.producto_origen || '—') : (mov.clasificacion || '—')}
                    </td>
                    <td className="px-4 py-3">{mov.nombre_operario}</td>
                    <td className="px-4 py-3">{formatearFecha(mov.fecha)}</td>
                    <td className="px-4 py-3">{mov.hora?.slice(0, 5)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        mov.origen_automatico ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {mov.origen_automatico ? 'Automático' : 'Manual'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {esAdmin && (
                        <MenuAcciones onEliminar={() => eliminarMovimiento(mov.id)} />
                      )}
                    </td>
                  </tr>
                ))}
                {movimientos.length === 0 && (
                  <tr>
                    <td colSpan="8" className="px-4 py-4 text-center text-slate-400">
                      Sin movimientos todavía.
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

export default Aglomerado