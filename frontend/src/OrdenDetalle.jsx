import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from './api'
import DetalleMovimiento from './DetalleMovimiento'
import VistaCotizacion from './VistaCotizacion'
import { generarPDFLiquidacion } from './GenerarPDFLiquidacion'

const TODOS_LOS_PROCESOS = ['Extrusión', 'Laminado', 'Impresión', 'Sellado', 'Corte', 'Almacén', 'Despacho']

const formatearFecha = (fecha) => {
  if (!fecha) return ''
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)}`
}

const calcularDuracion = (inicio, fin) => {
  if (!inicio || !fin) return null
  const [h1, m1] = inicio.split(':').map(Number)
  const [h2, m2] = fin.split(':').map(Number)
  let minutos = (h2 * 60 + m2) - (h1 * 60 + m1)
  if (minutos < 0) minutos += 24 * 60
  const horas = Math.floor(minutos / 60)
  const mins = minutos % 60
  return horas > 0 ? `${horas}h ${mins}min` : `${mins}min`
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
  const [verHojaPedido, setVerHojaPedido] = useState(false)
  const [generandoLiquidacion, setGenerandoLiquidacion] = useState(false)
  const [pedidoCompleto, setPedidoCompleto] = useState(null)
  const [cargandoPedido, setCargandoPedido] = useState(false)

  const descargarLiquidacion = async () => {
    setGenerandoLiquidacion(true)
    try {
      const res = await axios.get(`https://packtech-production.up.railway.app/reportes/liquidacion/${orden.codigo}`)
      await generarPDFLiquidacion(res.data)
    } catch (err) {
      alert(err.response?.data?.detail || 'No se pudo generar la liquidación.')
    } finally {
      setGenerandoLiquidacion(false)
    }
  }

  const cargar = async () => {
    setPedidoCompleto(null)
    try {
      const [ordenRes, movRes, opRes] = await Promise.all([
        axios.get(`https://packtech-production.up.railway.app/ordenes-produccion/${id}`),
        axios.get(`https://packtech-production.up.railway.app/ordenes-produccion/${id}/movimientos`),
        axios.get('https://packtech-production.up.railway.app/operarios?limit=1000')
      ])

      setOrden(ordenRes.data)
      setMovimientos(movRes.data)
      setOperarios(opRes.data)
      setCargando(false)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'No se pudo cargar el historial.')
      setCargando(false)
    }
  }

  const abrirHojaPedido = async () => {
    if (orden?.pedido_id && !pedidoCompleto) {
      setCargandoPedido(true)
      try {
        const res = await axios.get(`https://packtech-production.up.railway.app/pedidos/${orden.pedido_id}`)
        setPedidoCompleto(res.data)
      } catch (err) {
        console.error(err)
      } finally {
        setCargandoPedido(false)
      }
    }
    setVerHojaPedido(true)
  }

  useEffect(() => {
    cargar()
  }, [id])

  const nombreOperario = (opId) => {
    if (!opId) return ''
    return operarios.find(o => o.id === opId)?.nombre || ''
  }

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

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {orden ? `${orden.codigo} · ${orden.cliente}` : `Orden #${id}`}
          </h2>
          {orden?.descripcion && (
            <p className="text-slate-500 text-sm mt-1">{orden.descripcion}</p>
          )}
          {orden?.numero_std != null && (
            <p className="text-slate-400 text-xs mt-1">N° Estándar: {orden.numero_std}</p>
          )}
        </div>
        {orden && (
          <div className="flex gap-2">
            <button
              onClick={abrirHojaPedido}
              disabled={cargandoPedido}
              className="text-sm bg-slate-800 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-slate-900 disabled:opacity-50 whitespace-nowrap"
            >
              {cargandoPedido ? 'Cargando...' : '📄 Hoja de Pedido'}
            </button>
            <button
              onClick={descargarLiquidacion}
              disabled={generandoLiquidacion}
              className="text-sm bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
            >
              {generandoLiquidacion ? 'Generando...' : '📋 Liquidación'}
            </button>
          </div>
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
          {orden.tipo_trabajo && (
            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
              {orden.tipo_trabajo}
            </span>
          )}
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
                <th className="px-4 py-3">Merma</th>
                <th className="px-4 py-3">Faltante/Sobrante</th>
                <th className="px-4 py-3">Tiempo</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Hora</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((mov) => (
                <tr
                  key={mov.id}
                  onClick={() => setMovimientoAbierto(mov)}
                  className={`border-t border-slate-100 cursor-pointer hover:bg-slate-50 ${
                    (!mov.operario_id || !mov.maquina) ? 'bg-red-50' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-medium text-slate-800">{mov.proceso}</td>
                  <td className="px-4 py-3">
                    {mov.maquina || <span className="text-red-600 font-medium">Falta máquina</span>}
                  </td>
                  <td className="px-4 py-3">
                    {mov.operario_id ? nombreOperario(mov.operario_id) : <span className="text-red-600 font-medium">Falta operario</span>}
                  </td>
                  <td className="px-4 py-3">{mov.entrada}</td>
                  <td className="px-4 py-3">{mov.salida}</td>
                  <td className="px-4 py-3">{mov.unidad}</td>
                  <td className="px-4 py-3">{mov.merma_real != null ? mov.merma_real : '—'}</td>
                  <td className="px-4 py-3">{(Number(mov.entrada) - Number(mov.salida)).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {calcularDuracion(mov.hora_inicio, mov.hora_fin) || '—'}
                  </td>
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

      {verHojaPedido && orden && (
        <VistaCotizacion orden={pedidoCompleto || orden} onCerrar={() => setVerHojaPedido(false)} />
      )}
    </div>
  )
}

export default OrdenDetalle