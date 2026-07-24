import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import axios from './api'
import CrearOrden from './CrearOrden'
import Movimientos from './Movimientos'
import OrdenDetalle from './OrdenDetalle'
import Clientes from './Clientes'
import Operarios from './Operarios'

import { useState as useStateLogin } from 'react'
import Login from './Login'

function Ordenes() {
  const [ordenes, setOrdenes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const navegar = useNavigate()

  const cargarOrdenes = () => {
    setCargando(true)
    axios.get('https://packtech-production.up.railway.app/ordenes-produccion')
      .then((respuesta) => {
        setOrdenes(respuesta.data)
        setCargando(false)
      })
      .catch((err) => {
        console.error(err)
        setError('No se pudo conectar con el backend.')
        setCargando(false)
      })
  }

  useEffect(() => {
    cargarOrdenes()
  }, [])

  return (
    <div className="space-y-8">
      <div>
      <h1 className="text-2xl font-bold text-slate-800">Órdenes de Producción</h1>
      <p className="text-slate-500 text-sm mt-1">Gestiona y da seguimiento a la producción en planta.</p>
    </div>

<CrearOrden onCreada={cargarOrdenes} />

      <div>

        {cargando && <p className="text-slate-500">Cargando...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!cargando && !error && (
          <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Código</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">N° Std</th>
                  <th className="px-4 py-3">Cantidad</th>
                  <th className="px-4 py-3">Unidad</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Último Proceso</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Hora</th>
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
                    <td className="px-4 py-3">{orden.numero_std}</td>
                    <td className="px-4 py-3">{orden.cantidad}</td>
                    <td className="px-4 py-3">{orden.unidad}</td>
                    <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        orden.estado === 'Terminado' ? 'bg-green-100 text-green-700' :
                        orden.estado === 'En almacén' ? 'bg-blue-100 text-blue-700' :
                        orden.estado === 'En proceso' ? 'bg-amber-100 text-amber-700' :
                                          'bg-slate-100 text-slate-500'
                                                                      }`}>
                        {orden.estado}
                        </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {orden.ultimo_proceso}
                      </span>
                    </td>
                    <td className="px-4 py-3">{orden.fecha}</td>
                    <td className="px-4 py-3">{orden.hora?.slice(0, 5)}</td>
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

function App() {
  const [autenticado, setAutenticado] = useState(
    !!localStorage.getItem('packtech_clave')
  )

  if (!autenticado) {
    return <Login onIngresar={() => setAutenticado(true)} />
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <nav className="bg-slate-900 text-white px-8 py-4 flex gap-6 items-center shadow-md">
          <span className="font-bold text-lg tracking-tight">📦 PackTech</span>
          <div className="h-5 w-px bg-slate-700" />
        <Link to="/" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Órdenes</Link>
        <Link to="/movimientos" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Movimientos</Link>
        <Link to="/clientes" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Clientes</Link>
        <Link to="/operarios" className="text-slate-300 hover:text-white transition-colors text-sm font-medium">Operarios</Link>
        </nav>
        <button
  onClick={() => { localStorage.removeItem('packtech_clave'); window.location.reload() }}
  className="ml-auto text-slate-300 hover:text-white text-sm"
>
  Salir
</button>

        <div className="p-8">
          <Routes>
            <Route path="/" element={<Ordenes />} />
            <Route path="/movimientos" element={<Movimientos />} />
            <Route path="/ordenes/:id" element={<OrdenDetalle />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/operarios" element={<Operarios />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  )
}

export default App