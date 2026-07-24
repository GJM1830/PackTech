import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import axios from './api'

function OrdenDetalle() {
  const { id } = useParams()
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    axios.get(`https://packtech-production.up.railway.app/ordenes-produccion/${id}/movimientos`)
      .then((respuesta) => {
        setMovimientos(respuesta.data)
        setCargando(false)
      })
      .catch((err) => {
        console.error(err)
        setError('No se pudo cargar el historial.')
        setCargando(false)
      })
  }, [id])

  return (
    <div className="space-y-6">
      <Link to="/" className="text-slate-600 hover:text-slate-800 text-sm">
        ← Volver a Órdenes
      </Link>

      <h2 className="text-xl font-bold text-slate-800">
        Historial de la Orden #{id}
      </h2>

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
                  <td className="px-4 py-3 font-medium text-slate-800">{mov.proceso}</td>
                  <td className="px-4 py-3">{mov.operario_id}</td>
                  <td className="px-4 py-3">{mov.maquina}</td>
                  <td className="px-4 py-3">{mov.entrada}</td>
                  <td className="px-4 py-3">{mov.salida}</td>
                  <td className="px-4 py-3">{mov.unidad}</td>
                  <td className="px-4 py-3">{mov.merma}</td>
                  <td className="px-4 py-3">{mov.observacion}</td>
                  <td className="px-4 py-3">{mov.fecha}</td>
                  <td className="px-4 py-3">{mov.hora?.slice(0, 5)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default OrdenDetalle