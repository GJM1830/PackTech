import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from './api'
import DetalleMovimiento from './DetalleMovimiento'

const TODOS_LOS_PROCESOS = ['Extrusión', 'Laminado', 'Impresión', 'Sellado', 'Corte', 'Almacén', 'Despacho']

const formatearFecha = (fecha) => {
  if (!fecha) return ''
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)}`
}

function OrdenDetalle() {
  const { id } = useParams()
  const [orden, setOrden] = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [operarios, setOperarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [editandoPlan, setEditandoPlan] = useState(false)
  const [seleccionados, setSeleccionados] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [movimientoAbierto, setMovimientoAbierto] = useState(null)

  const cargar = async () => {
    try {
      const [ordenesRes, movRes, opRes] = await Promise.all([
        axios.get('https://packtech-production.up.railway.app/ordenes-produccion'),
        axios.get(`https://packtech-production.up.railway.app/ordenes-produccion/${id}/movimientos`),
        axios.get('https://packtech-production.up.railway.app/operarios')
      ])

      const ordenEncontrada = ordenesRes.data.find(o => o.id === parseInt(id))
      setOrden(ordenEncontrada)
      setMovimientos(movRes.data)
      setOperarios(opRes.data)
      setCargando(false)
    } catch (err) {
      console.error(err)
      setError('No se pudo cargar el historial.')
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [id])

  const nombreOperario = (opId) => operarios.find(o => o.id === opId)?.nombre || opId

  const abrirPlanificador = () => {
    const actuales = orden?.procesos_plan ? orden.procesos_plan.split(',') : []
    setSeleccionados(actuales)
    setEditandoPlan(true)
  }

  const guardarPlan = async () => {
    setGuardando(true)
    try {
      await axios.put(
        `https://packtech-production.up.railway.app/ordenes-produccion/${id}/procesos`,
        { procesos_plan: seleccionados.join(',') }
      )
      setEditandoPlan(false)
      cargar()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al guardar el plan de procesos.')
    } finally {
      setGuardando(false)
    }
  }

  const agregarProceso = (proceso) => {
    setSeleccionados((actual) => [...actual, proceso])
  }

  const quitarProceso = (index) => {
    setSeleccionados((actual) => actual.filter((_, i) => i !== index))
  }

  const moverProceso = (index, direccion) => {
    setSeleccionados((actual) => {
      const nuevo = [...actual]
      const destino = index + direccion
      if (destino < 0 || destino >= nuevo.length) return actual
      ;[nuevo[index], nuevo[destino]] = [nuevo[destino], nuevo[index]]
      return nuevo
    })
  }

  const procesosPlan = orden?.procesos_plan ? orden.procesos_plan.split(',') : []
  const procesosCompletados = new Set(movimientos.map((m) => m.proceso))

  return (
    <div className="space-y-6">
      <Link to="/" className="text-slate-600 hover:text-slate-800 text-sm">
        ← Volver a Órdenes
      </Link>

      <div>
        <h2 className="text-xl font-bold text-slate-800">
          {orden ? `${orden.codigo} · ${orden.cliente}` : `Orden #${id}`}
        </h2>
        {orden?.descripcion && (
          <p className="text-slate-500 text-sm mt-1">{orden.descripcion}</p>
        )}
      </div>

      {orden && (
        <div className="flex flex-wrap gap-3">
          <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
            orden.estado === 'Terminado' ? 'bg-green-100 text-green-700' :
            orden.estado === 'En almacén' ? 'bg-blue-100 text-blue-700' :
            orden.estado === 'En proceso' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
            'bg-slate-100 text-slate-500'
          }`}>
            Estado: {orden.estado}
          </span>
          <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
            Último proceso: {orden.ultimo_proceso}
          </span>
        </div>
      )}

      {/* PLAN DE PROCESOS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800">Ruta de Producción</h3>
          <button
            onClick={abrirPlanificador}
            className="text-sm text-slate-600 hover:text-slate-900 underline"
          >
            {procesosPlan.length > 0 ? 'Editar ruta' : 'Definir ruta'}
          </button>
        </div>

        {procesosPlan.length === 0 && (
          <p className="text-slate-400 text-sm">Aún no se ha definido por qué procesos pasará esta orden.</p>
        )}

        {procesosPlan.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {procesosPlan.map((proceso, i) => {
              const completado = procesosCompletados.has(proceso)
              const esActual = !completado && orden?.ultimo_proceso !== 'Sin iniciar' &&
                procesosPlan.findIndex(p => !procesosCompletados.has(p)) === i

              return (
                <div key={proceso} className="flex items-center gap-2">
                  <div className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                    completado ? 'bg-green-100 text-green-700 border-green-200' :
                    esActual ? 'bg-blue-50 text-blue-700 border-blue-300' :
                    'bg-slate-50 text-slate-400 border-slate-200'
                  }`}>
                    {completado ? '✓ ' : esActual ? '● ' : ''}{proceso}
                  </div>
                  {i < procesosPlan.length - 1 && (
                    <span className="text-slate-300">→</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {cargando && <p className="text-slate-500">Cargando...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!cargando && !error && movimientos.length === 0 && (
        <p className="text-slate-500">Esta orden aún no tiene movimientos registrados.</p>
      )}

      {!cargando && !error && movimientos.length > 0 && (
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">Proceso</th>
                <th className="px-4 py-3">Máquina</th>
                <th className="px-4 py-3">Operario</th>
                <th className="px-4 py-3">Entrada</th>
                <th className="px-4 py-3">Salida</th>
                <th className="px-4 py-3">Unidad</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Hora</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((mov) => (
                <tr
                  key={mov.id}
                  onClick={() => setMovimientoAbierto(mov)}
                  className="border-t border-slate-100 cursor-pointer hover:bg-slate-50"
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{mov.proceso}</td>
                  <td className="px-4 py-3">{mov.maquina}</td>
                  <td className="px-4 py-3">{nombreOperario(mov.operario_id)}</td>
                  <td className="px-4 py-3">{mov.entrada}</td>
                  <td className="px-4 py-3">{mov.salida}</td>
                  <td className="px-4 py-3">{mov.unidad}</td>
                  <td className="px-4 py-3">{formatearFecha(mov.fecha)}</td>
                  <td className="px-4 py-3">{mov.hora?.slice(0, 5)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editandoPlan && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Definir Ruta de Producción</h3>
            <p className="text-sm text-slate-500 mb-4">
              Agrega los procesos en el orden que quieras. Puedes reordenarlos con las flechas.
            </p>

            <div className="mb-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Procesos disponibles
              </p>
              <div className="flex flex-wrap gap-2">
                {TODOS_LOS_PROCESOS.filter((p) => !seleccionados.includes(p)).map((proceso) => (
                  <button
                    key={proceso}
                    type="button"
                    onClick={() => agregarProceso(proceso)}
                    className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-50 text-slate-600 border border-slate-200 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                  >
                    + {proceso}
                  </button>
                ))}
                {TODOS_LOS_PROCESOS.every((p) => seleccionados.includes(p)) && (
                  <p className="text-sm text-slate-400">Ya agregaste todos los procesos.</p>
                )}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                Tu ruta ({seleccionados.length})
              </p>

              {seleccionados.length === 0 && (
                <p className="text-sm text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-3 py-3 text-center">
                  Agrega procesos arriba para armar la ruta.
                </p>
              )}

              <div className="space-y-2">
                {seleccionados.map((proceso, index) => (
                  <div
                    key={`${proceso}-${index}`}
                    className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2"
                  >
                    <span className="text-xs font-bold text-blue-700 bg-white rounded-full w-5 h-5 flex items-center justify-center border border-blue-300">
                      {index + 1}
                    </span>
                    <span className="flex-1 text-sm font-medium text-blue-800">{proceso}</span>
                    <button
                      type="button"
                      onClick={() => moverProceso(index, -1)}
                      disabled={index === 0}
                      className="text-blue-600 hover:text-blue-800 disabled:opacity-30 disabled:cursor-not-allowed px-1"
                      title="Mover arriba"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moverProceso(index, 1)}
                      disabled={index === seleccionados.length - 1}
                      className="text-blue-600 hover:text-blue-800 disabled:opacity-30 disabled:cursor-not-allowed px-1"
                      title="Mover abajo"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => quitarProceso(index)}
                      className="text-red-500 hover:text-red-700 px-1"
                      title="Quitar"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditandoPlan(false)}
                className="flex-1 border border-slate-300 rounded-lg py-2 font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={guardarPlan}
                disabled={guardando}
                className="flex-1 bg-green-700 text-white rounded-lg py-2 font-medium hover:bg-green-800 disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {movimientoAbierto && (
        <DetalleMovimiento
          movimiento={movimientoAbierto}
          orden={orden}
          onCerrar={() => setMovimientoAbierto(null)}
        />
      )}
    </div>
  )
}

export default OrdenDetalle