import { useEffect, useState } from 'react'
import axios from './api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, LabelList
} from 'recharts'

const formatearFecha = (fecha) => {
  if (!fecha) return ''
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)}`
}

const formatearFechaCorta = (fecha) => {
  if (!fecha) return ''
  const [, mes, dia] = fecha.split('-')
  return `${dia}/${mes}`
}

// Formatea con separador de miles y máximo 1 decimal (evita "2847.7799999999997")
const fmt = (n) => {
  const v = Number(n) || 0
  return v.toLocaleString('es-PE', { maximumFractionDigits: 1 })
}

// ===================================================================
// Fechas — TODO en hora LOCAL del navegador (Lima), nunca toISOString().
// toISOString() convierte a UTC y desfasa el día después de las 7pm en Perú.
// ===================================================================
const pad2 = (n) => String(n).padStart(2, '0')
const aISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

const sumarDias = (d, n) => {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

// Lunes de la semana de "base" (semana ISO: lunes a domingo)
const inicioSemana = (base = new Date()) => {
  const d = new Date(base)
  const dia = d.getDay() // 0=domingo ... 6=sábado
  const diff = dia === 0 ? 6 : dia - 1
  d.setDate(d.getDate() - diff)
  return d
}

const PERIODOS = [
  {
    id: 'dia',
    label: 'Hoy',
    desde: () => aISO(new Date()),
    hasta: () => aISO(new Date()),
    anterior: () => {
      const ayer = sumarDias(new Date(), -1)
      return { desde: aISO(ayer), hasta: aISO(ayer) }
    }
  },
  {
    id: 'semana',
    label: 'Esta semana',
    desde: () => aISO(inicioSemana()),
    hasta: () => aISO(sumarDias(inicioSemana(), 6)),
    anterior: () => {
      const inicioAnt = sumarDias(inicioSemana(), -7)
      return { desde: aISO(inicioAnt), hasta: aISO(sumarDias(inicioAnt, 6)) }
    }
  },
  {
    id: 'mes',
    label: 'Este mes',
    desde: () => { const d = new Date(); return aISO(new Date(d.getFullYear(), d.getMonth(), 1)) },
    hasta: () => { const d = new Date(); return aISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)) },
    anterior: () => {
      const d = new Date()
      const inicio = new Date(d.getFullYear(), d.getMonth() - 1, 1)
      const fin = new Date(d.getFullYear(), d.getMonth(), 0)
      return { desde: aISO(inicio), hasta: aISO(fin) }
    }
  },
  {
    id: 'anio',
    label: 'Este año',
    desde: () => { const d = new Date(); return aISO(new Date(d.getFullYear(), 0, 1)) },
    hasta: () => { const d = new Date(); return aISO(new Date(d.getFullYear(), 11, 31)) },
    anterior: () => {
      const d = new Date()
      return {
        desde: aISO(new Date(d.getFullYear() - 1, 0, 1)),
        hasta: aISO(new Date(d.getFullYear() - 1, 11, 31))
      }
    }
  },
  { id: 'todo', label: 'Todo', desde: () => '', hasta: () => '', anterior: () => null }
]

const AGRUPACIONES = [
  { id: 'proceso', label: 'Proceso' },
  { id: 'maquina', label: 'Máquina' },
  { id: 'operario', label: 'Operario' },
  { id: 'cliente', label: 'Cliente' }
]

// ===================================================================
// Selector de periodo reutilizable (con opción "Personalizado")
// ===================================================================
function SelectorPeriodo({ periodo, setPeriodo, rangoCustom, setRangoCustom }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
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
        <div className="flex items-center gap-1.5 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
          <span>Desde</span>
          <input
            type="date"
            value={rangoCustom.desde}
            onChange={(e) => setRangoCustom({ ...rangoCustom, desde: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1 text-sm"
          />
          <span>hasta</span>
          <input
            type="date"
            value={rangoCustom.hasta}
            onChange={(e) => setRangoCustom({ ...rangoCustom, hasta: e.target.value })}
            className="border border-slate-300 rounded px-2 py-1 text-sm"
          />
        </div>
      )}
    </div>
  )
}

// ===================================================================
// Chip de variación vs. periodo anterior
// ===================================================================
function Delta({ actual, anterior, positivoEsBueno = true }) {
  if (anterior == null || anterior === 0) {
    return <span className="text-xs text-slate-300">Sin dato previo</span>
  }
  const cambio = ((actual - anterior) / anterior) * 100
  if (!isFinite(cambio)) return null

  const estable = Math.abs(cambio) < 0.5
  const subio = cambio > 0
  const bueno = positivoEsBueno ? subio : !subio
  const color = estable ? 'text-slate-400' : bueno ? 'text-green-600' : 'text-red-600'
  const flecha = estable ? '→' : subio ? '▲' : '▼'

  return (
    <span className={`text-xs font-semibold ${color}`}>
      {flecha} {Math.abs(cambio).toFixed(1)}% vs. periodo anterior
    </span>
  )
}

function TarjetaKPI({ titulo, valor, unidad, delta, tono }) {
  const tonos = {
    slate: 'bg-slate-50 border-slate-100 text-slate-400',
    blue: 'bg-blue-50 border-blue-100 text-blue-500',
    red: 'bg-red-50 border-red-100 text-red-500',
    green: 'bg-green-50 border-green-100 text-green-600'
  }
  return (
    <div className={`rounded-xl px-4 py-3 border ${tonos[tono]}`}>
      <p className="text-xs uppercase tracking-wide">{titulo}</p>
      <p className="text-2xl font-bold text-slate-800 mt-0.5">
        {valor}
        {unidad && <span className="text-sm font-medium text-slate-400 ml-1">{unidad}</span>}
      </p>
      <div className="mt-1">{delta}</div>
    </div>
  )
}

// Color de barra de rendimiento según el % (señal de decisión rápida)
const colorRendimiento = (pct) => {
  if (pct >= 95) return '#16a34a' // verde
  if (pct >= 85) return '#f59e0b' // ámbar
  return '#dc2626' // rojo
}

// ===================================================================
// VISTA GENERAL — dashboard principal
// ===================================================================
function VistaGeneral() {
  const [periodo, setPeriodo] = useState('semana')
  const [agrupacion, setAgrupacion] = useState('proceso')
  const [rangoCustom, setRangoCustom] = useState({ desde: aISO(new Date()), hasta: aISO(new Date()) })
  const [datos, setDatos] = useState([])
  const [datosAnterior, setDatosAnterior] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const rangoActual = () => {
    if (periodo === 'custom') return { desde: rangoCustom.desde, hasta: rangoCustom.hasta }
    const p = PERIODOS.find((x) => x.id === periodo)
    return { desde: p.desde(), hasta: p.hasta() }
  }

  const rangoAnterior = () => {
    if (periodo === 'custom' || periodo === 'todo') return null
    const p = PERIODOS.find((x) => x.id === periodo)
    return p.anterior()
  }

  const cargar = async () => {
    setCargando(true)
    const { desde, hasta } = rangoActual()
    const anterior = rangoAnterior()

    try {
      const peticiones = [
        axios.get('https://packtech-production.up.railway.app/reportes/resumen', {
          params: { agrupar_por: agrupacion, desde: desde || undefined, hasta: hasta || undefined }
        })
      ]

      if (anterior) {
        peticiones.push(
          axios.get('https://packtech-production.up.railway.app/reportes/resumen', {
            params: { agrupar_por: agrupacion, desde: anterior.desde, hasta: anterior.hasta }
          })
        )
      }

      const respuestas = await Promise.all(peticiones)
      setDatos(respuestas[0].data)
      setDatosAnterior(anterior ? respuestas[1].data : null)
      setError(null)
    } catch (err) {
      console.error(err)
      setError('No se pudo cargar el reporte.')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargar()
  }, [periodo, agrupacion, rangoCustom.desde, rangoCustom.hasta])

  const totalEntrada = datos.reduce((s, d) => s + d.entrada, 0)
  const totalSalida = datos.reduce((s, d) => s + d.salida, 0)
  const totalMerma = datos.reduce((s, d) => s + d.merma, 0)
  const totalMovimientos = datos.reduce((s, d) => s + d.movimientos, 0)
  const rendimiento = totalEntrada > 0 ? (totalSalida / totalEntrada) * 100 : null

  const totalEntradaAnt = datosAnterior ? datosAnterior.reduce((s, d) => s + d.entrada, 0) : null
  const totalSalidaAnt = datosAnterior ? datosAnterior.reduce((s, d) => s + d.salida, 0) : null
  const totalMermaAnt = datosAnterior ? datosAnterior.reduce((s, d) => s + d.merma, 0) : null
  const rendimientoAnt = totalEntradaAnt > 0 ? (totalSalidaAnt / totalEntradaAnt) * 100 : null

  const etiquetaAgrupacion = AGRUPACIONES.find((a) => a.id === agrupacion).label

  // Datos de rendimiento por grupo, ordenados de peor a mejor (para decidir dónde actuar primero)
  const datosRendimiento = datos
    .map((d) => ({
      etiqueta: d.etiqueta,
      rendimiento: d.entrada > 0 ? Math.min(100, (d.salida / d.entrada) * 100) : 0
    }))
    .sort((a, b) => a.rendimiento - b.rendimiento)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SelectorPeriodo
          periodo={periodo}
          setPeriodo={setPeriodo}
          rangoCustom={rangoCustom}
          setRangoCustom={setRangoCustom}
        />
        <div className="flex flex-wrap gap-2">
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
      </div>

      {cargando && <p className="text-slate-500">Cargando...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!cargando && !error && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <TarjetaKPI
              titulo="Entrada total"
              valor={fmt(totalEntrada)}
              unidad="kg"
              tono="slate"
              delta={<Delta actual={totalEntrada} anterior={totalEntradaAnt} />}
            />
            <TarjetaKPI
              titulo="Salida total"
              valor={fmt(totalSalida)}
              unidad="kg"
              tono="blue"
              delta={<Delta actual={totalSalida} anterior={totalSalidaAnt} />}
            />
            <TarjetaKPI
              titulo="Merma total"
              valor={fmt(totalMerma)}
              unidad="kg"
              tono="red"
              delta={<Delta actual={totalMerma} anterior={totalMermaAnt} positivoEsBueno={false} />}
            />
            <TarjetaKPI
              titulo="Rendimiento"
              valor={rendimiento != null ? rendimiento.toFixed(1) : '—'}
              unidad={rendimiento != null ? '%' : ''}
              tono="green"
              delta={<Delta actual={rendimiento} anterior={rendimientoAnt} />}
            />
          </div>

          <p className="text-xs text-slate-400">
            {totalMovimientos} movimiento{totalMovimientos !== 1 ? 's' : ''} registrado{totalMovimientos !== 1 ? 's' : ''} en el periodo · Rendimiento = Salida ÷ Entrada
          </p>

          {datos.length === 0 ? (
            <p className="text-slate-400 text-center py-8">Sin datos para este periodo.</p>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">
                    Entrada / Salida / Merma por {etiquetaAgrupacion.toLowerCase()}
                  </h3>
                  <ResponsiveContainer width="100%" height={Math.max(240, datos.length * 60)}>
                    <BarChart data={datos} layout="vertical" margin={{ left: 10, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString('es-PE')} />
                      <YAxis dataKey="etiqueta" type="category" width={110} tick={{ fontSize: 12 }} />
                      <Tooltip
                        cursor={{ fill: 'rgba(226,232,240,0.35)' }}
                        formatter={(v) => `${fmt(v)} kg`}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="entrada" name="Entrada" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={14}>
                        <LabelList dataKey="entrada" position="right" formatter={fmt} style={{ fontSize: 10, fill: '#64748b' }} />
                      </Bar>
                      <Bar dataKey="salida" name="Salida" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={14}>
                        <LabelList dataKey="salida" position="right" formatter={fmt} style={{ fontSize: 10, fill: '#1d4ed8' }} />
                      </Bar>
                      <Bar dataKey="merma" name="Merma" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={14}>
                        <LabelList dataKey="merma" position="right" formatter={fmt} style={{ fontSize: 10, fill: '#b91c1c' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-1">
                    Rendimiento por {etiquetaAgrupacion.toLowerCase()}
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Salida ÷ Entrada · ordenado de menor a mayor (dónde revisar primero)
                  </p>
                  <ResponsiveContainer width="100%" height={Math.max(240, datosRendimiento.length * 60)}>
                    <BarChart data={datosRendimiento} layout="vertical" margin={{ left: 10, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                      <YAxis dataKey="etiqueta" type="category" width={110} tick={{ fontSize: 12 }} />
                      <Tooltip cursor={{ fill: 'rgba(226,232,240,0.35)' }} formatter={(v) => `${v.toFixed(1)}%`} />
                      <Bar dataKey="rendimiento" radius={[0, 4, 4, 0]} barSize={18}>
                        {datosRendimiento.map((d, i) => (
                          <Cell key={i} fill={colorRendimiento(d.rendimiento)} />
                        ))}
                        <LabelList
                          dataKey="rendimiento"
                          position="right"
                          formatter={(v) => `${v.toFixed(1)}%`}
                          style={{ fontSize: 10, fill: '#475569' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex gap-4 mt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" /> ≥ 95%</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> 85–95%</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> &lt; 85%</span>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">{etiquetaAgrupacion}</th>
                      <th className="px-4 py-3">Entrada</th>
                      <th className="px-4 py-3">Salida</th>
                      <th className="px-4 py-3">Merma</th>
                      <th className="px-4 py-3">% Merma</th>
                      <th className="px-4 py-3">Rendimiento</th>
                      <th className="px-4 py-3">Movimientos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos
                      .slice()
                      .sort((a, b) => b.entrada - a.entrada)
                      .map((d) => {
                        const rend = d.entrada > 0 ? (d.salida / d.entrada) * 100 : null
                        return (
                          <tr key={d.etiqueta} className="border-t border-slate-100">
                            <td className="px-4 py-3 font-medium text-slate-800">{d.etiqueta}</td>
                            <td className="px-4 py-3">{fmt(d.entrada)}</td>
                            <td className="px-4 py-3">{fmt(d.salida)}</td>
                            <td className="px-4 py-3 text-red-600 font-medium">{fmt(d.merma)}</td>
                            <td className="px-4 py-3">
                              {d.entrada > 0 ? `${((d.merma / d.entrada) * 100).toFixed(1)}%` : '—'}
                            </td>
                            <td className="px-4 py-3">
                              {rend != null ? (
                                <span
                                  className="px-2 py-0.5 rounded-full text-xs font-semibold"
                                  style={{
                                    color: colorRendimiento(rend),
                                    backgroundColor: `${colorRendimiento(rend)}1a`
                                  }}
                                >
                                  {rend.toFixed(1)}%
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-500">{d.movimientos}</td>
                          </tr>
                        )
                      })}
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

// ===================================================================
// VISTA POR TIPO DE MERMA
// ===================================================================
const COLORES_MERMA = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#8b5cf6', '#ec4899', '#64748b']

function VistaTipoMerma() {
  const [periodo, setPeriodo] = useState('semana')
  const [rangoCustom, setRangoCustom] = useState({ desde: aISO(new Date()), hasta: aISO(new Date()) })
  const [datos, setDatos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const cargar = () => {
    setCargando(true)
    let desde, hasta
    if (periodo === 'custom') {
      desde = rangoCustom.desde
      hasta = rangoCustom.hasta
    } else {
      const p = PERIODOS.find((x) => x.id === periodo)
      desde = p.desde()
      hasta = p.hasta()
    }

    axios.get('https://packtech-production.up.railway.app/reportes/tipos-merma', {
      params: { desde: desde || undefined, hasta: hasta || undefined }
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
  }, [periodo, rangoCustom.desde, rangoCustom.hasta])

  const totalPeso = datos.reduce((s, d) => s + d.peso, 0)
  const top3 = datos.slice().sort((a, b) => b.peso - a.peso).slice(0, 3)

  return (
    <div className="space-y-6">
      <SelectorPeriodo
        periodo={periodo}
        setPeriodo={setPeriodo}
        rangoCustom={rangoCustom}
        setRangoCustom={setRangoCustom}
      />

      {cargando && <p className="text-slate-500">Cargando...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!cargando && !error && (
        datos.length === 0 ? (
          <p className="text-slate-400 text-center py-8">Sin mermas registradas para este periodo.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <TarjetaKPI titulo="Merma total detallada" valor={fmt(totalPeso)} unidad="kg" tono="red" delta={null} />
              {top3.map((d, i) => (
                <div key={d.etiqueta} className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: COLORES_MERMA[i] }} />
                    #{i + 1} causa
                  </p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5 truncate">{d.etiqueta}</p>
                  <p className="text-xs text-slate-500">
                    {fmt(d.peso)} kg · {totalPeso > 0 ? ((d.peso / totalPeso) * 100).toFixed(1) : 0}% del total
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Merma por tipo</h3>
              <ResponsiveContainer width="100%" height={Math.max(280, datos.length * 45)}>
                <BarChart data={datos} layout="vertical" margin={{ left: 10, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => v.toLocaleString('es-PE')} />
                  <YAxis dataKey="etiqueta" type="category" width={140} tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: 'rgba(226,232,240,0.35)' }} formatter={(v) => `${fmt(v)} kg`} />
                  <Bar dataKey="peso" name="Merma (kg)" radius={[0, 4, 4, 0]}>
                    {datos.map((_, i) => (
                      <Cell key={i} fill={COLORES_MERMA[i % COLORES_MERMA.length]} />
                    ))}
                    <LabelList dataKey="peso" position="right" formatter={fmt} style={{ fontSize: 10, fill: '#64748b' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Tipo de merma</th>
                    <th className="px-4 py-3">Peso</th>
                    <th className="px-4 py-3">% del total</th>
                    <th className="px-4 py-3">Registros</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.slice().sort((a, b) => b.peso - a.peso).map((d) => (
                    <tr key={d.etiqueta} className="border-t border-slate-100">
                      <td className="px-4 py-3 font-medium text-slate-800">{d.etiqueta}</td>
                      <td className="px-4 py-3 text-red-600 font-medium">{fmt(d.peso)} kg</td>
                      <td className="px-4 py-3">{totalPeso > 0 ? `${((d.peso / totalPeso) * 100).toFixed(1)}%` : '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{d.registros}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      )}
    </div>
  )
}

// ===================================================================
// VISTA POR ORDEN (sin cambios de fondo, solo formato de cifras)
// ===================================================================
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
                {fmt(reporte.cantidad)} {reporte.unidad} planificado
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide">Entrada total</p>
                <p className="text-xl font-bold text-slate-800">{fmt(reporte.total_entrada)}</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <p className="text-xs text-blue-500 uppercase tracking-wide">Salida total</p>
                <p className="text-xl font-bold text-blue-800">{fmt(reporte.total_salida)}</p>
              </div>
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <p className="text-xs text-red-500 uppercase tracking-wide">Merma total</p>
                <p className="text-xl font-bold text-red-700">{fmt(reporte.total_merma)}</p>
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
                    <Tooltip formatter={(v) => fmt(v)} />
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
                        <td className="px-4 py-3">{fmt(p.entrada)}</td>
                        <td className="px-4 py-3">{fmt(p.salida)}</td>
                        <td className="px-4 py-3 text-red-600 font-medium">{fmt(p.merma)}</td>
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
        <button
          onClick={() => setVista('tipoMerma')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            vista === 'tipoMerma' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Por Tipo de Merma
        </button>
      </div>

      {vista === 'general' && <VistaGeneral />}
      {vista === 'orden' && <VistaOrden />}
      {vista === 'tipoMerma' && <VistaTipoMerma />}
    </div>
  )
}

export default Reportes