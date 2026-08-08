import { useEffect, useState } from 'react'
import axios from './api'
import MenuAcciones from './MenuAcciones'
import DetalleMovimiento from './DetalleMovimiento'

const MAQUINAS_POR_PROCESO = {
  'Extrusión': ['Extrusora-01', 'Extrusora-02', 'Extrusora-03'],
  'Laminado': ['Laminadora-01', 'Laminadora-02'],
  'Impresión': ['Impresora-01', 'Impresora-02'],
  'Sellado': [
    'Selladora-01', 'Selladora-02', 'Selladora-03',
    'Selladora-04', 'Selladora-05', 'Selladora-06'
  ],
  'Corte': ['Cortadora-01', 'Cortadora-02'],
  'Almacén': ['Almacén'],
  'Despacho': ['Almacén']
}

function Movimientos() {
  const [movimientos, setMovimientos] = useState([])
  const [ordenes, setOrdenes] = useState([])
  const [operarios, setOperarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [busquedaOrden, setBusquedaOrden] = useState('')
  const [sugerenciasOrdenes, setSugerenciasOrdenes] = useState([])
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null)

  const eliminarMovimiento = async (id) => {
    if (!confirm('¿Seguro que quieres eliminar este movimiento?')) return

    try {
      await axios.delete(`https://packtech-production.up.railway.app/movimientos/${id}`)
      cargarDatos()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al eliminar el movimiento.')
    }
  }

  const [form, setForm] = useState({
    orden_id: '',
    proceso: '',
    nombre_operario: '',
    maquina: '',
    entrada: '',
    salida: '',
    unidad: 'kg',
    merma: '',
    observacion: ''
  })
  const [enviando, setEnviando] = useState(false)
  const [errorForm, setErrorForm] = useState(null)
  const [movimientoAbierto, setMovimientoAbierto] = useState(null)

  const cargarDatos = async () => {
    setCargando(true)
    try {
      const [movRes, ordRes, opRes] = await Promise.all([
        axios.get('https://packtech-production.up.railway.app/movimientos'),
        axios.get('https://packtech-production.up.railway.app/ordenes-produccion'),
        axios.get('https://packtech-production.up.railway.app/operarios')
      ])

      setMovimientos(movRes.data)
      setOrdenes(ordRes.data)
      setOperarios(opRes.data)
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

  const manejarCambio = (e) => {
    const { name, value } = e.target

    if (name === 'proceso') {
      setForm({ ...form, proceso: value, maquina: '' })
    } else {
      setForm({ ...form, [name]: value })
    }
  }

  const manejarEnvio = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setErrorForm(null)

    try {
      await axios.post('https://packtech-production.up.railway.app/movimientos', {
        orden_id: parseInt(form.orden_id),
        proceso: form.proceso,
        nombre_operario: form.nombre_operario.trim(),
        maquina: form.maquina,
        entrada: parseFloat(form.entrada),
        salida: parseFloat(form.salida),
        unidad: form.unidad,
        merma: parseFloat(form.merma),
        observacion: form.observacion || null
      })

      setForm({
        orden_id: '',
        proceso: '',
        nombre_operario: '',
        maquina: '',
        entrada: '',
        salida: '',
        unidad: 'kg',
        merma: '',
        observacion: ''
      })
      setBusquedaOrden('')
      setOrdenSeleccionada(null)

      cargarDatos()
    } catch (err) {
      const mensaje = err.response?.data?.detail || 'Error al registrar el movimiento.'
      setErrorForm(mensaje)
    } finally {
      setEnviando(false)
    }
  }

  const maquinasDisponibles = form.proceso ? MAQUINAS_POR_PROCESO[form.proceso] || [] : []

  const nombreOperario = (id) => operarios.find(o => o.id === id)?.nombre || id
  
  useEffect(() => {
  if (busquedaOrden.trim().length < 2 || ordenSeleccionada) {
    setSugerenciasOrdenes([])
    return
  }

  const temporizador = setTimeout(() => {
    axios.get(`https://packtech-production.up.railway.app/ordenes-produccion/buscar?q=${busquedaOrden}`)
      .then((res) => setSugerenciasOrdenes(res.data))
      .catch((err) => console.error(err))
  }, 300)

  return () => clearTimeout(temporizador)
}, [busquedaOrden, ordenSeleccionada])

  return (
    <div className="space-y-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">
          Registrar Movimiento
        </h2>

        <form onSubmit={manejarEnvio} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Orden de Producción
              </label>
              <input
                type="text"
                value={busquedaOrden}
                onChange={(e) => {
                  setBusquedaOrden(e.target.value)
                  setOrdenSeleccionada(null)
                  setForm({ ...form, orden_id: '' })
                }}
                required
                autoComplete="off"
                className="w-full border border-slate-300 rounded px-3 py-2"
                placeholder="Escribe el código (ej. OP-001)"
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
                        setForm({ ...form, orden_id: orden.id })
                        setSugerenciasOrdenes([])
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                    >
                      <span className="font-medium text-slate-800">{orden.codigo}</span>
                      <span className="text-slate-400"> · {orden.cliente}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Operario
              </label>
              <input
                type="text"
                name="nombre_operario"
                value={form.nombre_operario}
                onChange={manejarCambio}
                required
                list="lista-operarios"
                autoComplete="off"
                className="w-full border border-slate-300 rounded px-3 py-2"
                placeholder="Escribe o elige un nombre"
              />
              <datalist id="lista-operarios">
                {operarios.map((op) => (
                  <option key={op.id} value={op.nombre} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Proceso
              </label>
              <select
                name="proceso"
                value={form.proceso}
                onChange={manejarCambio}
                required
                className="w-full border border-slate-300 rounded px-3 py-2"
              >
                <option value="">Seleccionar...</option>
                <option value="Extrusión">Extrusión</option>
                <option value="Laminado">Laminado</option>
                <option value="Impresión">Impresión</option>
                <option value="Sellado">Sellado</option>
                <option value="Corte">Corte</option>
                <option value="Almacén">Almacén</option>
                <option value="Despacho">Despacho</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Máquina
              </label>
              <select
                name="maquina"
                value={form.maquina}
                onChange={manejarCambio}
                required
                disabled={!form.proceso}
                className="w-full border border-slate-300 rounded px-3 py-2 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">
                  {form.proceso ? 'Seleccionar...' : 'Elige un proceso primero'}
                </option>
                {maquinasDisponibles.map((maquina) => (
                  <option key={maquina} value={maquina}>{maquina}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Entrada
              </label>
              <input
                type="number"
                step="0.01"
                name="entrada"
                value={form.entrada}
                onChange={manejarCambio}
                required
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Salida
              </label>
              <input
                type="number"
                step="0.01"
                name="salida"
                value={form.salida}
                onChange={manejarCambio}
                required
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Merma
              </label>
              <input
                type="number"
                step="0.01"
                name="merma"
                value={form.merma}
                onChange={manejarCambio}
                required
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>

            <div className="w-28">
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Unidad
              </label>
              <select
                name="unidad"
                value={form.unidad}
                onChange={manejarCambio}
                className="w-full border border-slate-300 rounded px-3 py-2"
              >
                <option value="kg">kg</option>
                <option value="unidades">unidades</option>
                <option value="rollos">rollos</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Observación
            </label>
            <input
              type="text"
              name="observacion"
              value={form.observacion}
              onChange={manejarCambio}
              className="w-full border border-slate-300 rounded px-3 py-2"
              placeholder="sin novedad"
            />
          </div>

          {errorForm && <p className="text-red-600 text-sm">{errorForm}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-slate-900 text-white rounded-lg py-2.5 font-medium hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {enviando ? 'Registrando...' : 'Registrar Movimiento'}
          </button>
        </form>
      </div>

    <div>
      <h2 className="text-xl font-bold text-slate-800 mb-4">
        Movimientos
      </h2>

      {cargando && <p className="text-slate-500">Cargando...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!cargando && !error && (
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Orden</th>
                <th className="px-4 py-3">Proceso</th>
                <th className="px-4 py-3">Operario</th>
                <th className="px-4 py-3">Máquina</th>
                <th className="px-4 py-3">Entrada</th>
                <th className="px-4 py-3">Salida</th>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3">Merma</th>
                <th className="px-4 py-3">Observación</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Hora</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((mov) => (
                <tr
                  key={mov.id}
                  onClick={() => setMovimientoAbierto(mov)}
                  className="border-t border-slate-100 cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {ordenes.find(o => o.id === mov.orden_id)?.codigo || mov.orden_id}
                  </td>
                  <td className="px-4 py-3">{mov.proceso}</td>
                  <td className="px-4 py-3">{nombreOperario(mov.operario_id)}</td>
                  <td className="px-4 py-3">{mov.maquina}</td>
                  <td className="px-4 py-3">{mov.entrada}</td>
                  <td className="px-4 py-3">{mov.salida}</td>
                  <td className="px-4 py-3">{mov.unidad}</td>
                  <td className="px-4 py-3">{mov.merma}</td>
                  <td className="px-4 py-3">{mov.observacion}</td>
                  <td className="px-4 py-3">{mov.fecha}</td>
                  <td className="px-4 py-3">{mov.hora?.slice(0, 5)}</td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <MenuAcciones
                      onDuplicar={() => console.log('duplicar', mov.id)}
                      onEliminar={() => eliminarMovimiento(mov.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>

    {movimientoAbierto && (
      <DetalleMovimiento
        movimiento={movimientoAbierto}
        orden={ordenes.find(o => o.id === movimientoAbierto.orden_id)}
        onCerrar={() => setMovimientoAbierto(null)}
      />
    )}
    </div>
  )
}

export default Movimientos