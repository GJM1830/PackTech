import { useEffect, useState } from 'react'
import axios from './api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const formatearFecha = (fecha) => {
  if (!fecha) return ''
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)}`
}

const hoyISO = () => new Date().toISOString().slice(0, 10)

const restarDias = (dias) => {
  const d = new Date()
  d.setDate(d.getDate() - dias)
  return d.toISOString().slice(0, 10)
}

const PERIODOS = [
  { id: 'dia', label: 'Hoy', desde: () => hoyISO() },
  { id: 'semana', label: 'Última semana', desde: () => restarDias(7) },
  { id: 'mes', label: 'Último mes', desde: () => restarDias(30) },
  { id: 'anio', label: 'Último año', desde: () => restarDias(365) },
  { id: 'todo', label: 'Todo', desde: () => '' }
]

const AGRUPACIONES = [
  { id: 'proceso', label: 'Proceso' },
  { id: 'maquina', label: 'Máquina' },
  { id: 'operario', label: 'Operario' },
  { id: 'cliente', label: 'Cliente' }
]

function VistaGeneral() {
  const [periodo, setPeriodo] = useState('semana')
  const [agrupacion, setAgrupacion] = useState('proceso')
  const [datos, setDatos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargar = () => {
    setCargando(true)
    const p = PERIODOS.find((x) => x.id === periodo)
    const desde = p.desde()

    axios.get('https://packtech-production.up.railway.app/reportes/resumen', {
      params: { agrupar_por: agrupacion, desde: desde || undefined }
    })
      .then((res) => {
        setDatos(res.data)
        setError(null)
      })
      .catch((err) => {
        console.error(err)
        setError('No se pudo cargar el reporte.')
      })
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargar()
  }, [periodo, agrupacion])

  const totalEntrada = datos.reduce((s, d) => s + d.entrada, 0)
  const totalSalida = datos.reduce((s, d) => s + d.salida, 0)
  const totalMerma = datos.reduce((s, d) => s + d.merma, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {PERIODOS.map((p) => (
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

        <div className="w-px bg-slate-200 mx-1" />

        {AGRUPACIONES.map((a) => (
          <button
            key={a.id}
            onClick={() => setAgrupacion(a.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              agrupacion === a.id
                ? 'bg-blue-700 text-white border-blue-700'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            }`}
          >
            Por {a.label}
          </button>
        ))}
      </div>

      {cargando && <p className="text-slate-500">Cargando...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!cargando && !error && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Entrada total</p>
              <p className="text-xl font-bold text-slate-800">{totalEntrada.toFixed(2)} kg</p>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-xs text-blue-500 uppercase tracking-wide">Salida total</p>
              <p className="text-xl font-bold text-blue-800">{totalSalida.toFixed(2)} kg</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <p className="text-xs text-red-500 uppercase tracking-wide">Merma total</p>
              <p className="text-xl font-bold text-red-700">{totalMerma.toFixed(2)} kg</p>
            </div>
          </div>

          {datos.length === 0 ? (
            <p className="text-slate-400 text-center py-8">Sin datos para este periodo.</p>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">
                  Entrada / Salida / Merma por {AGRUPACIONES.find((a) => a.id === agrupacion).label.toLowerCase()}
                </h3>
                <ResponsiveContainer width="100%" height={Math.max(280, datos.length * 50)}>
                  <BarChart data={datos} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="etiqueta" type="category" width={120} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="entrada" name="Entrada" fill="#94a3b8" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="salida" name="Salida" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="merma" name="Merma" fill="#ef4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">{AGRUPACIONES.find((a) => a.id === agrupacion).label}</th>
                      <th className="px-4 py-3">Entrada</th>
                      <th className="px-4 py-3">Salida</th>
                      <th className="px-4 py-3">Merma</th>
                      <th className="px-4 py-3">% Merma</th>
                      <th className="px-4 py-3">Movimientos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.map((d) => (
                      <tr key={d.etiqueta} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-800">{d.etiqueta}</td>
                        <td className="px-4 py-3">{d.entrada.toFixed(2)}</td>
                        <td className="px-4 py-3">{d.salida.toFixed(2)}</td>
                        <td className="px-4 py-3 text-red-600 font-medium">{d.merma.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          {d.entrada > 0 ? `${((d.merma / d.entrada) * 100).toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{d.movimientos}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function VistaOrden() {
  const [busqueda, setBusqueda] = useState('')
  const [sugerencias, setSugerencias] = useState([])
  const [reporte, setReporte] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (busqueda.trim().length < 2) {
      setSugerencias([])
      return
    }
    const t = setTimeout(() => {
      axios.get(`https://packtech-production.up.railway.app/ordenes-produccion/buscar?q=${busqueda}`)
        .then((res) => setSugerencias(res.data))
        .catch((err) => console.error(err))
    }, 300)
    return () => clearTimeout(t)
  }, [busqueda])

  const seleccionarOrden = (codigo) => {
    setBusqueda(codigo)
    setSugerencias([])
    setCargando(true)
    setError(null)
    axios.get(`https://packtech-production.up.railway.app/reportes/orden/${codigo}`)
      .then((res) => setReporte(res.data))
      .catch((err) => {
        setError(err.response?.data?.detail || 'No se pudo cargar la orden.')
        setReporte(null)
      })
      .finally(() => setCargando(false))
  }

  const datosGrafico = reporte
    ? reporte.pasos.map((p) => ({
        etiqueta: p.proceso,
        entrada: p.entrada,
        salida: p.salida,
        merma: p.merma
      }))
    : []

  return (
    <div className="space-y-6">
      <div className="max-w-md relative">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setReporte(null) }}
          autoComplete="off"
          placeholder="Escribe el código de la orden (ej. OP-001)"
          className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
        />
        {sugerencias.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {sugerencias.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => seleccionarOrden(o.codigo)}
                className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 border-b border-slate-100 last:border-0"
              >
                <span className="font-medium text-slate-800">{o.codigo}</span>
                <span className="text-slate-400"> · {o.cliente}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {cargando && <p className="text-slate-500">Cargando...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {reporte && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">{reporte.codigo}</h3>
                <p className="text-sm text-slate-500">
                  {reporte.cliente} · {reporte.descripcion || 'Sin descripción'}
                </p>
              </div>
              <span className="text-sm text-slate-400">
                {reporte.cantidad} {reporte.unidad} planificado
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Entrada total</p>
                <p className="text-xl font-bold text-slate-800">{reporte.total_entrada.toFixed(2)}</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <p className="text-xs text-blue-500 uppercase tracking-wide">Salida total</p>
                <p className="text-xl font-bold text-blue-800">{reporte.total_salida.toFixed(2)}</p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <p className="text-xs text-red-500 uppercase tracking-wide">Merma total</p>
                <p className="text-xl font-bold text-red-700">{reporte.total_merma.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {reporte.pasos.length === 0 ? (
            <p className="text-slate-400 text-center py-8">Esta orden aún no tiene movimientos registrados.</p>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Recorrido por proceso</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={datosGrafico}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="entrada" name="Entrada" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="salida" name="Salida" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="merma" name="Merma" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">Proceso</th>
                      <th className="px-4 py-3">Máquina</th>
                      <th className="px-4 py-3">Operario</th>
                      <th className="px-4 py-3">Entrada</th>
                      <th className="px-4 py-3">Salida</th>
                      <th className="px-4 py-3">Merma</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Hora</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reporte.pasos.map((p, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-medium text-slate-800">{p.proceso}</td>
                        <td className="px-4 py-3">{p.maquina}</td>
                        <td className="px-4 py-3">{p.operario}</td>
                        <td className="px-4 py-3">{p.entrada}</td>
                        <td className="px-4 py-3">{p.salida}</td>
                        <td className="px-4 py-3 text-red-600 font-medium">{p.merma}</td>
                        <td className="px-4 py-3">{formatearFecha(p.fecha)}</td>
                        <td className="px-4 py-3">{p.hora?.slice(0, 5)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Reportes() {
  const [vista, setVista] = useState('general')

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reportes</h1>
        <p className="text-slate-500 text-sm mt-1">Analiza la producción por periodo o revisa el recorrido completo de una orden.</p>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setVista('general')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            vista === 'general' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Vista General
        </button>
        <button
          onClick={() => setVista('orden')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            vista === 'orden' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Por Orden
        </button>
      </div>

      {vista === 'general' ? <VistaGeneral /> : <VistaOrden />}
    </div>
  )
}

export default Reportes