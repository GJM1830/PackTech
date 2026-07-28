import { useEffect, useState } from 'react'
import axios from './api'
import MenuAcciones from './MenuAcciones'

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
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [form, setForm] = useState({
    orden_id: '',
    proceso: '',
    operario_id: '',
    maquina: '',
    entrada: '',
    salida: '',
    unidad: 'kg',
    merma: '',
    observacion: ''
  })
  const [enviando, setEnviando] = useState(false)
  const [errorForm, setErrorForm] = useState(null)

  const cargarDatos = async () => {
    setCargando(true)
    try {
      const [movRes, ordRes] = await Promise.all([
        axios.get('https://packtech-production.up.railway.app/movimientos'),
        axios.get('https://packtech-production.up.railway.app/ordenes-produccion')
      ])

      setMovimientos(movRes.data)
      setOrdenes(ordRes.data)
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
        operario_id: parseInt(form.operario_id),
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
        operario_id: '',
        maquina: '',
        entrada: '',
        salida: '',
        unidad: 'kg',
        merma: '',
        observacion: ''
      })

      cargarDatos()
    } catch (err) {
      const mensaje = err.response?.data?.detail || 'Error al registrar el movimiento.'
      setErrorForm(mensaje)
    } finally {
      setEnviando(false)
    }
  }

  const maquinasDisponibles = form.proceso ? MAQUINAS_POR_PROCESO[form.proceso] || [] : []

  return (
    <div className="space-y-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">
          Registrar Movimiento
        </h2>

        <form onSubmit={manejarEnvio} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Orden de Producción
              </label>
              <select
                name="orden_id"
                value={form.orden_id}
                onChange={manejarCambio}
                required
                className="w-full border border-slate-300 rounded px-3 py-2"
              >
                <option value="">Seleccione una OP</option>
                {ordenes.map((orden) => (
                  <option key={orden.id} value={orden.id}>
                    {orden.codigo}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-600 mb-1">
                ID Operario
              </label>
              <input
                type="number"
                name="operario_id"
                value={form.operario_id}
                onChange={manejarCambio}
                required
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
            </div>
          </div>

          <div className="flex gap-4">
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

          <div className="flex gap-4">
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
                </tr>
              </thead>
              <tbody>
                {movimientos.map((mov) => (
                  <tr key={mov.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {ordenes.find(o => o.id === mov.orden_id)?.codigo || mov.orden_id}
                    </td>
                    <td className="px-4 py-3">{mov.proceso}</td>
                    <td className="px-4 py-3">{mov.operario_id}</td>
                    <td className="px-4 py-3">{mov.maquina}</td>
                    <td className="px-4 py-3">{mov.entrada}</td>
                    <td className="px-4 py-3">{mov.salida}</td>
                    <td className="px-4 py-3">{mov.unidad}</td>
                    <td className="px-4 py-3">{mov.merma}</td>
                    <td className="px-4 py-3">{mov.observacion}</td>
                    <td className="px-4 py-3">{mov.fecha}</td>
                    <td className="px-4 py-3">{mov.hora?.slice(0, 5)}</td>
                    <th className="px-4 py-3">Acciones</th>
                    <td className="px-4 py-3">
                      <MenuAcciones
                        onEditar={() => console.log('editar', mov.id)}
                        onDuplicar={() => console.log('duplicar', mov.id)}
                        onEliminar={() => console.log('eliminar', mov.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Movimientos