import { useEffect, useState } from 'react'
import axios from './api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, LabelList
} from 'recharts'
import { generarPDFReporte } from './GenerarPDFReporte'

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

// Color según si el movimiento tiene o no merma registrada (dato real, no una meta)
const colorSinMerma = (sinMerma, total) => {
  if (total === 0) return '#94a3b8'
  const pct = (sinMerma / total) * 100
  if (pct === 0) return '#16a34a' // verde: todo registrado
  if (pct <= 20) return '#f59e0b' // ámbar: algunos huecos
  return '#dc2626' // rojo: muchos movimientos sin merma
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
  const totalSinMerma = datos.reduce((s, d) => s + d.movimientos_sin_merma, 0)

  const totalEntradaAnt = datosAnterior ? datosAnterior.reduce((s, d) => s + d.entrada, 0) : null
  const totalSalidaAnt = datosAnterior ? datosAnterior.reduce((s, d) => s + d.salida, 0) : null
  const totalMermaAnt = datosAnterior ? datosAnterior.reduce((s, d) => s + d.merma, 0) : null
  const totalSinMermaAnt = datosAnterior ? datosAnterior.reduce((s, d) => s + d.movimientos_sin_merma, 0) : null

  const etiquetaAgrupacion = AGRUPACIONES.find((a) => a.id === agrupacion).label

  // Movimientos sin merma por grupo, ordenados de peor a mejor (registro incompleto primero)
  const datosSinMerma = datos
    .map((d) => ({
      etiqueta: d.etiqueta,
      sin_merma: d.movimientos_sin_merma,
      total: d.movimientos
    }))
    .sort((a, b) => b.sin_merma - a.sin_merma)

  const [descargando, setDescargando] = useState(false)

  const descargarPDF = async () => {
    setDescargando(true)
    try {
      const { desde, hasta } = rangoActual()
      const etiquetaPeriodo = periodo === 'custom' ? 'Personalizado' : PERIODOS.find((x) => x.id === periodo).label
      await generarPDFReporte({
        tipo: 'general',
        periodoLabel: etiquetaPeriodo,
        desde,
        hasta,
        agrupacionLabel: etiquetaAgrupacion,
        datos,
        totales: {
          entrada: totalEntrada, salida: totalSalida, merma: totalMerma,
          sinMerma: totalSinMerma, movimientos: totalMovimientos
        },
        totalesAnterior: datosAnterior
          ? { entrada: totalEntradaAnt, salida: totalSalidaAnt, merma: totalMermaAnt, sinMerma: totalSinMermaAnt }
          : null
      })
    } catch (err) {
      console.error(err)
      alert('No se pudo generar el PDF.')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SelectorPeriodo
          periodo={periodo}
          setPeriodo={setPeriodo}
          rangoCustom={rangoCustom}
          setRangoCustom={setRangoCustom}
        />
        <div className="flex flex-wrap items-center gap-2">
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
          <button
            onClick={descargarPDF}
            disabled={descargando || cargando || datos.length === 0}
            className="text-sm bg-slate-800 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-slate-900 disabled:opacity-50 whitespace-nowrap"
          >
            {descargando ? 'Generando...' : '⬇ Descargar PDF'}
          </button>
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
              titulo="Sin merma registrada"
              valor={totalSinMerma}
              unidad={totalMovimientos > 0 ? `de ${totalMovimientos}` : ''}
              tono={totalSinMerma === 0 ? 'green' : 'red'}
              delta={<Delta actual={totalSinMerma} anterior={totalSinMermaAnt} positivoEsBueno={false} />}
            />
          </div>

          <p className="text-xs text-slate-400">
            {totalMovimientos} movimiento{totalMovimientos !== 1 ? 's' : ''} registrado{totalMovimientos !== 1 ? 's' : ''} en el periodo · La merma real es obligatoria en cada proceso
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
                    Movimientos sin merma por {etiquetaAgrupacion.toLowerCase()}
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">
                    Registros donde no se cargó merma real · posible registro incompleto
                  </p>
                  {datosSinMerma.every((d) => d.sin_merma === 0) ? (
                    <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center py-10">
                      <span className="text-3xl">✅</span>
                      <p className="text-sm font-medium text-green-700 mt-2">Todos los movimientos tienen merma registrada</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={Math.max(240, datosSinMerma.length * 60)}>
                      <BarChart data={datosSinMerma} layout="vertical" margin={{ left: 10, right: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis dataKey="etiqueta" type="category" width={110} tick={{ fontSize: 12 }} />
                        <Tooltip
                          cursor={{ fill: 'rgba(226,232,240,0.35)' }}
                          formatter={(v, n, item) => [`${v} de ${item.payload.total}`, 'Sin merma']}
                        />
                        <Bar dataKey="sin_merma" radius={[0, 4, 4, 0]} barSize={18}>
                          {datosSinMerma.map((d, i) => (
                            <Cell key={i} fill={colorSinMerma(d.sin_merma, d.total)} />
                          ))}
                          <LabelList
                            dataKey="sin_merma"
                            position="right"
                            formatter={(v) => (v > 0 ? v : '')}
                            style={{ fontSize: 10, fill: '#475569' }}
                          />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                  <div className="flex gap-4 mt-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-600 inline-block" /> Todo registrado</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Algunos huecos</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> Muchos sin merma</span>
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
                      <th className="px-4 py-3">Sin merma</th>
                      <th className="px-4 py-3">Movimientos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos
                      .slice()
                      .sort((a, b) => b.entrada - a.entrada)
                      .map((d) => (
                        <tr key={d.etiqueta} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-medium text-slate-800">{d.etiqueta}</td>
                          <td className="px-4 py-3">{fmt(d.entrada)}</td>
                          <td className="px-4 py-3">{fmt(d.salida)}</td>
                          <td className="px-4 py-3 text-red-600 font-medium">{fmt(d.merma)}</td>
                          <td className="px-4 py-3">
                            {d.entrada > 0 ? `${((d.merma / d.entrada) * 100).toFixed(1)}%` : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {d.movimientos_sin_merma > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600">
                                {d.movimientos_sin_merma} de {d.movimientos}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-600">
                                Completo
                              </span>
                            )}
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


  const top3 = datos.slice().sort((a, b) => b.peso - a.peso).slice(0, 3)
  const totalPeso = datos.reduce((s, d) => s + d.peso, 0)

  const [descargando, setDescargando] = useState(false)

  const descargarPDF = async () => {
    setDescargando(true)
    try {
      let desde, hasta
      if (periodo === 'custom') {
        desde = rangoCustom.desde
        hasta = rangoCustom.hasta
      } else {
        const p = PERIODOS.find((x) => x.id === periodo)
        desde = p.desde()
        hasta = p.hasta()
      }
      const etiquetaPeriodo = periodo === 'custom' ? 'Personalizado' : PERIODOS.find((x) => x.id === periodo).label
      await generarPDFReporte({ tipo: 'tipoMerma', periodoLabel: etiquetaPeriodo, desde, hasta, datos, totalPeso })
    } catch (err) {
      console.error(err)
      alert('No se pudo generar el PDF.')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SelectorPeriodo
          periodo={periodo}
          setPeriodo={setPeriodo}
          rangoCustom={rangoCustom}
          setRangoCustom={setRangoCustom}
        />
        <button
          onClick={descargarPDF}
          disabled={descargando || cargando || datos.length === 0}
          className="text-sm bg-slate-800 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-slate-900 disabled:opacity-50 whitespace-nowrap"
        >
          {descargando ? 'Generando...' : '⬇ Descargar PDF'}
        </button>
      </div>

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

  const [descargando, setDescargando] = useState(false)

  const descargarPDF = async () => {
    if (!reporte) return
    setDescargando(true)
    try {
      await generarPDFReporte({ tipo: 'orden', reporte })
    } catch (err) {
      console.error(err)
      alert('No se pudo generar el PDF.')
    } finally {
      setDescargando(false)
    }
  }

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
              <div className="text-right">
                <span className="text-sm text-slate-400 block mb-2">
                  {fmt(reporte.cantidad)} {reporte.unidad} planificado
                </span>
                <button
                  onClick={descargarPDF}
                  disabled={descargando}
                  className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-slate-900 disabled:opacity-50 whitespace-nowrap"
                >
                  {descargando ? 'Generando...' : '⬇ Descargar PDF'}
                </button>
              </div>
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

// ===================================================================
// VISTA ALERTAS — anomalías de producción sobre datos reales
// ===================================================================
function TarjetaSeccion({ titulo, subtitulo, count, tono, children }) {
  const tonos = {
    ok: 'border-green-200',
    alerta: 'border-amber-300',
    critico: 'border-red-300'
  }
  const badge = {
    ok: 'bg-green-100 text-green-700',
    alerta: 'bg-amber-100 text-amber-700',
    critico: 'bg-red-100 text-red-700'
  }
  return (
    <div className={`bg-white rounded-xl shadow-sm border p-5 ${tonos[tono]}`}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-slate-800">{titulo}</h3>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badge[tono]}`}>{count}</span>
      </div>
      {subtitulo && <p className="text-xs text-slate-400 mb-3">{subtitulo}</p>}
      {children}
    </div>
  )
}

function VistaAlertas() {
  const [periodo, setPeriodo] = useState('semana')
  const [rangoCustom, setRangoCustom] = useState({ desde: aISO(new Date()), hasta: aISO(new Date()) })
  const [diasEstancado, setDiasEstancado] = useState(3)
  const [umbralPocos, setUmbralPocos] = useState(3)
  const [datos, setDatos] = useState(null)
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

    axios.get('https://packtech-production.up.railway.app/reportes/alertas', {
      params: {
        desde: desde || undefined,
        hasta: hasta || undefined,
        dias_estancado: diasEstancado,
        umbral_pocos_movimientos: umbralPocos
      }
    })
      .then((res) => { setDatos(res.data); setError(null) })
      .catch((err) => { console.error(err); setError('No se pudo cargar las alertas.') })
      .finally(() => setCargando(false))
  }

  useEffect(() => {
    cargar()
  }, [periodo, rangoCustom.desde, rangoCustom.hasta, diasEstancado, umbralPocos])

  const [descargando, setDescargando] = useState(false)

  const descargarPDF = async () => {
    if (!datos) return
    setDescargando(true)
    try {
      let desde, hasta
      if (periodo === 'custom') {
        desde = rangoCustom.desde
        hasta = rangoCustom.hasta
      } else {
        const p = PERIODOS.find((x) => x.id === periodo)
        desde = p.desde()
        hasta = p.hasta()
      }
      const etiquetaPeriodo = periodo === 'custom' ? 'Personalizado' : PERIODOS.find((x) => x.id === periodo).label
      await generarPDFReporte({
        tipo: 'alertas',
        periodoLabel: etiquetaPeriodo,
        desde,
        hasta,
        datos,
        parametros: { diasEstancado, umbralPocos }
      })
    } catch (err) {
      console.error(err)
      alert('No se pudo generar el PDF.')
    } finally {
      setDescargando(false)
    }
  }

  if (cargando) return <p className="text-slate-500">Cargando...</p>
  if (error) return <p className="text-red-600">{error}</p>
  if (!datos) return null

  const vacio = (lista) => !lista || lista.length === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SelectorPeriodo
          periodo={periodo}
          setPeriodo={setPeriodo}
          rangoCustom={rangoCustom}
          setRangoCustom={setRangoCustom}
        />
        <div className="flex items-center gap-3 text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
          <label className="flex items-center gap-1.5">
            Días para "estancada"
            <input
              type="number"
              min="1"
              value={diasEstancado}
              onChange={(e) => setDiasEstancado(parseInt(e.target.value) || 1)}
              className="w-14 border border-slate-300 rounded px-1.5 py-0.5 text-sm"
            />
          </label>
          <label className="flex items-center gap-1.5">
            Umbral "pocos movimientos"
            <input
              type="number"
              min="0"
              value={umbralPocos}
              onChange={(e) => setUmbralPocos(parseInt(e.target.value) || 0)}
              className="w-14 border border-slate-300 rounded px-1.5 py-0.5 text-sm"
            />
          </label>
        </div>
        <button
          onClick={descargarPDF}
          disabled={descargando}
          className="text-sm bg-slate-800 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-slate-900 disabled:opacity-50 whitespace-nowrap"
        >
          {descargando ? 'Generando...' : '⬇ Descargar PDF'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TarjetaSeccion
          titulo="Órdenes sin ningún movimiento"
          subtitulo="Pedidos aprobados que aún no entraron a producción"
          count={datos.ordenes_sin_movimientos.length}
          tono={vacio(datos.ordenes_sin_movimientos) ? 'ok' : 'alerta'}
        >
          {vacio(datos.ordenes_sin_movimientos) ? (
            <p className="text-sm text-green-700">✅ Todas las órdenes tienen movimientos.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1.5">
              {datos.ordenes_sin_movimientos.map((o) => (
                <div key={o.codigo} className="flex justify-between text-sm bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                  <span className="font-medium text-slate-800">{o.codigo}</span>
                  <span className="text-slate-500">{o.cliente}</span>
                </div>
              ))}
            </div>
          )}
        </TarjetaSeccion>

        <TarjetaSeccion
          titulo="Órdenes estancadas"
          subtitulo={`Sin movimiento hace ${diasEstancado}+ días`}
          count={datos.ordenes_estancadas.length}
          tono={vacio(datos.ordenes_estancadas) ? 'ok' : 'critico'}
        >
          {vacio(datos.ordenes_estancadas) ? (
            <p className="text-sm text-green-700">✅ Ninguna orden está parada.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1.5">
              {datos.ordenes_estancadas.map((o) => (
                <div key={o.codigo} className="flex justify-between items-center text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
                  <div>
                    <span className="font-medium text-slate-800">{o.codigo}</span>
                    <span className="text-slate-500"> · {o.cliente} · {o.ultimo_proceso}</span>
                  </div>
                  <span className="text-red-600 font-semibold text-xs whitespace-nowrap ml-2">{o.dias_sin_movimiento}d</span>
                </div>
              ))}
            </div>
          )}
        </TarjetaSeccion>

        <TarjetaSeccion
          titulo="Días con pocos movimientos"
          subtitulo={`Últimos 14 días con ${umbralPocos} o menos registros`}
          count={datos.dias_pocos_movimientos.length}
          tono={vacio(datos.dias_pocos_movimientos) ? 'ok' : 'alerta'}
        >
          {vacio(datos.dias_pocos_movimientos) ? (
            <p className="text-sm text-green-700">✅ Actividad normal todos los días.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1.5">
              {datos.dias_pocos_movimientos.map((d) => (
                <div key={d.fecha} className="flex justify-between text-sm bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                  <span className="text-slate-700">{formatearFecha(d.fecha)}</span>
                  <span className="font-semibold text-amber-700">{d.movimientos} movimiento{d.movimientos !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          )}
        </TarjetaSeccion>

        <TarjetaSeccion
          titulo="Movimientos sin merma registrada"
          subtitulo="Posible registro incompleto en el periodo seleccionado"
          count={datos.movimientos_sin_merma.length}
          tono={vacio(datos.movimientos_sin_merma) ? 'ok' : 'alerta'}
        >
          {vacio(datos.movimientos_sin_merma) ? (
            <p className="text-sm text-green-700">✅ Todos los movimientos tienen merma registrada.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1.5">
              {datos.movimientos_sin_merma.map((m) => (
                <div key={m.movimiento_id} className="flex justify-between text-sm bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                  <span className="text-slate-700">
                    <span className="font-medium text-slate-800">{m.codigo_orden}</span> · {m.proceso} · {m.maquina || 'Sin máquina'}
                  </span>
                  <span className="text-slate-400 text-xs whitespace-nowrap ml-2">{formatearFechaCorta(m.fecha)}</span>
                </div>
              ))}
            </div>
          )}
        </TarjetaSeccion>

        <TarjetaSeccion
          titulo="Máquinas con más merma acumulada"
          subtitulo="Top 10 en el periodo seleccionado"
          count={datos.maquinas_top_merma.length}
          tono="ok"
        >
          {vacio(datos.maquinas_top_merma) ? (
            <p className="text-sm text-slate-400">Sin mermas registradas en el periodo.</p>
          ) : (
            <div className="space-y-2">
              {datos.maquinas_top_merma.map((m, i) => {
                const max = datos.maquinas_top_merma[0].merma || 1
                return (
                  <div key={m.maquina}>
                    <div className="flex justify-between text-xs text-slate-600 mb-0.5">
                      <span className="font-medium">{i + 1}. {m.maquina}</span>
                      <span>{fmt(m.merma)} kg · {m.registros} reg.</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-400 rounded-full"
                        style={{ width: `${(m.merma / max) * 100}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TarjetaSeccion>

        <TarjetaSeccion
          titulo="Merma anormalmente alta"
          subtitulo="Movimientos muy por encima del promedio de su mismo proceso"
          count={datos.ordenes_merma_excesiva.length}
          tono={vacio(datos.ordenes_merma_excesiva) ? 'ok' : 'critico'}
        >
          {vacio(datos.ordenes_merma_excesiva) ? (
            <p className="text-sm text-slate-400">Sin anomalías detectadas (o aún no hay suficiente historial por proceso).</p>
          ) : (
            <div className="max-h-56 overflow-y-auto space-y-1.5">
              {datos.ordenes_merma_excesiva.map((m) => (
                <div key={m.movimiento_id} className="flex justify-between items-center text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
                  <span className="text-slate-700">
                    <span className="font-medium text-slate-800">{m.codigo_orden}</span> · {m.proceso} · {m.maquina || 'Sin máquina'}
                  </span>
                  <span className="text-right text-xs whitespace-nowrap ml-2">
                    <span className="text-red-600 font-bold">{fmt(m.merma_real)} kg</span>
                    <span className="text-slate-400 block">prom. {fmt(m.promedio_proceso)} kg</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </TarjetaSeccion>
      </div>
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
        <button
          onClick={() => setVista('alertas')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            vista === 'alertas' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Alertas
        </button>
      </div>

      {vista === 'general' && <VistaGeneral />}
      {vista === 'orden' && <VistaOrden />}
      {vista === 'tipoMerma' && <VistaTipoMerma />}
      {vista === 'alertas' && <VistaAlertas />}
    </div>
  )
}

export default Reportes