import { useEffect, useState } from 'react'
import axios from './api'

const PROCESOS_ESPECIALES = ['Extrusión', 'Impresión', 'Corte']
const PROCESOS_DOBLE_LADO = ['Impresión', 'Corte']

function DetalleMovimiento({ movimiento, orden, onCerrar }) {
  const esExtrusion = movimiento.proceso === 'Extrusión'
  const esDobleLado = PROCESOS_DOBLE_LADO.includes(movimiento.proceso)
  const esProcesoEspecial = PROCESOS_ESPECIALES.includes(movimiento.proceso)  

  const [detallesMerma, setDetallesMerma] = useState([])
  const [pesoMerma, setPesoMerma] = useState('')
  const [tipoMermaInput, setTipoMermaInput] = useState('')
  const [sugerenciasTipoMerma, setSugerenciasTipoMerma] = useState([])
  const [enviandoMerma, setEnviandoMerma] = useState(false)
  const [ladoActivo, setLadoActivo] = useState('salida')
  const [tipo, setTipo] = useState('bobina')
  const [detalles, setDetalles] = useState([])
  const [cargando, setCargando] = useState(true)
  const [pesoBruto, setPesoBruto] = useState('')
  const [pesoTuco, setPesoTuco] = useState('')
  const [peso, setPeso] = useState('')
  const [millares, setMillares] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)

  const cargarDetallesMerma = () => {
    axios.get(`https://packtech-production.up.railway.app/movimientos/${movimiento.id}/mermas`)
      .then((res) => setDetallesMerma(res.data))
      .catch((err) => console.error(err))
  }

  const cargarDetalles = () => {
    setCargando(true)
    axios.get(`https://packtech-production.up.railway.app/movimientos/${movimiento.id}/detalles`)
      .then((res) => {
        setDetalles(res.data)
        if (!esProcesoEspecial && res.data.length > 0) setTipo(res.data[0].tipo)
        setCargando(false)
      })
      .catch((err) => {
        console.error(err)
        setCargando(false)
      })
  }
  
  useEffect(() => {
  if (!esProcesoEspecial || tipoMermaInput.trim().length < 2) {
    setSugerenciasTipoMerma([])
    return
  }
  const temporizador = setTimeout(() => {
      axios.get(`https://packtech-production.up.railway.app/tipos-merma/buscar?proceso=${encodeURIComponent(movimiento.proceso)}&q=${tipoMermaInput}`)
        .then((res) => setSugerenciasTipoMerma(res.data))
        .catch((err) => console.error(err))
    }, 300)
    return () => clearTimeout(temporizador)
  }, [tipoMermaInput, esProcesoEspecial])

    useEffect(() => {
      cargarDetalles()
      if (esProcesoEspecial) cargarDetallesMerma()
    }, []) 

  const detallesLado = (lado) => detalles.filter(d => d.lado === lado)
  const sumaNeto = (lista) => lista.reduce((s, d) => s + Number(d.peso_neto), 0)

  const entradaBobinas = detallesLado('entrada')
  const salidaBobinas = detallesLado('salida')

  const entradaCalculada = esDobleLado ? sumaNeto(entradaBobinas) : Number(movimiento.entrada)
  const salidaCalculada = esProcesoEspecial ? sumaNeto(salidaBobinas) : Number(movimiento.salida)
  const mermaTeorica = entradaCalculada - salidaCalculada

  const agregarDetalleEspecial = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError(null)

    const lado = esDobleLado ? ladoActivo : 'salida'
    const siguienteNumero = detallesLado(lado).length + 1

    try {
      await axios.post(`https://packtech-production.up.railway.app/movimientos/${movimiento.id}/detalles`, {
        tipo: 'bobina',
        lado,
        numero: siguienteNumero,
        peso_bruto: parseFloat(pesoBruto),
        peso_tuco: parseFloat(pesoTuco) || 0,
        millares: null
      })
      setPesoBruto('')
      setPesoTuco('')
      cargarDetalles()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al agregar la bobina.')
    } finally {
      setEnviando(false)
    }
  }

  const agregarDetalleSimple = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError(null)

    const siguienteNumero = detalles.length + 1

    try {
      await axios.post(`https://packtech-production.up.railway.app/movimientos/${movimiento.id}/detalles`, {
        tipo,
        lado: 'salida',
        numero: siguienteNumero,
        peso_bruto: parseFloat(peso),
        peso_tuco: 0,
        millares: tipo === 'fardo' ? parseFloat(millares) : null
      })
      setPeso('')
      setMillares('')
      cargarDetalles()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al agregar el detalle.')
    } finally {
      setEnviando(false)
    }
  }

  const eliminarDetalle = async (id) => {
    if (!confirm('¿Eliminar este registro?')) return
    try {
      await axios.delete(`https://packtech-production.up.railway.app/detalles/${id}`)
      cargarDetalles()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al eliminar.')
    }
  }

  const agregarMerma = async (e) => {
  e.preventDefault()
  setEnviandoMerma(true)
  try {
    await axios.post(`https://packtech-production.up.railway.app/movimientos/${movimiento.id}/mermas`, {
      peso: parseFloat(pesoMerma),
      tipo_merma: tipoMermaInput.trim() || null
    })
    setPesoMerma('')
    setTipoMermaInput('')
    cargarDetallesMerma()
  } catch (err) {
    alert(err.response?.data?.detail || 'Error al agregar la merma.')
  } finally {
    setEnviandoMerma(false)
  }
}

const eliminarMerma = async (id) => {
  if (!confirm('¿Eliminar este registro de merma?')) return
  try {
    await axios.delete(`https://packtech-production.up.railway.app/mermas/${id}`)
    cargarDetallesMerma()
  } catch (err) {
    alert(err.response?.data?.detail || 'Error al eliminar.')
  }
}

const totalMermaDetallada = detallesMerma.reduce((s, d) => s + Number(d.peso), 0)

  const totalPesoSimple = detalles.reduce((s, d) => s + Number(d.peso_neto), 0)
  const totalMillaresSimple = detalles.reduce((s, d) => s + Number(d.millares || 0), 0)
  const etiqueta = tipo === 'bobina' ? 'Bobina' : 'Fardo'
  const etiquetaPlural = tipo === 'bobina' ? 'Bobinas' : 'Fardos'

  const TablaBobinas = ({ lista, titulo }) => (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold text-slate-700">{titulo}</h4>
        <span className="text-xs text-slate-400">
          {lista.length} bobina{lista.length !== 1 ? 's' : ''} · {sumaNeto(lista).toFixed(2)} kg neto
        </span>
      </div>
      <div className="overflow-x-auto bg-slate-50 rounded-lg border border-slate-100">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-2">N°</th>
              <th className="px-4 py-2">Bruto</th>
              <th className="px-4 py-2">Tuco</th>
              <th className="px-4 py-2">Neto</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((d) => (
              <tr key={d.id} className="border-t border-slate-200">
                <td className="px-4 py-2">{d.numero}</td>
                <td className="px-4 py-2">{d.peso_bruto}</td>
                <td className="px-4 py-2">{d.peso_tuco}</td>
                <td className="px-4 py-2 font-medium text-slate-800">{d.peso_neto}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => eliminarDetalle(d.id)}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan="5" className="px-4 py-4 text-center text-slate-400">
                  Sin bobinas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Detalle del Movimiento</h3>
            <p className="text-sm text-slate-500 mt-1">
              {orden?.cliente || 'Cliente desconocido'} · N° Std {orden?.numero_std ?? '-'} · {movimiento.proceso}
            </p>
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-700 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Entrada</p>
            <p className="text-sm font-semibold text-slate-800">{entradaCalculada.toFixed(2)} {movimiento.unidad}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Salida</p>
            <p className="text-sm font-semibold text-slate-800">{salidaCalculada.toFixed(2)} {movimiento.unidad}</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            <p className="text-xs text-blue-500 uppercase tracking-wide">Faltante/Sobrante</p>
            <p className="text-sm font-semibold text-blue-800">
              {mermaTeorica.toFixed(2)} {movimiento.unidad}
            </p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2">
          <p className="text-xs text-green-600 uppercase tracking-wide">Merma real</p>
          <p className="text-sm font-semibold text-green-800">
            {totalMermaDetallada > 0 ? `${totalMermaDetallada.toFixed(2)} ${movimiento.unidad}` : '—'}
          </p>
        </div>
      </div>

        {esProcesoEspecial && (
          <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 mb-5">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Observación</p>
            <p className="text-sm font-medium text-slate-700 truncate">
              {movimiento.observacion?.trim() ? movimiento.observacion : 'Sin observación'}
            </p>
          </div>
        )}

        {!esProcesoEspecial && (
          <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 mb-5">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Observación</p>
            <p className="text-sm font-medium text-slate-700 truncate">
              {movimiento.observacion?.trim() ? movimiento.observacion : 'Sin observación'}
            </p>
          </div>
        )}

        {esProcesoEspecial ? (
          <>
            {esDobleLado && (
              <div className="flex gap-2 mb-4 border-b border-slate-200">
                <button
                  onClick={() => setLadoActivo('entrada')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    ladoActivo === 'entrada' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Bobinas de Entrada
                </button>
                <button
                  onClick={() => setLadoActivo('salida')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    ladoActivo === 'salida' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Bobinas de Salida
                </button>
              </div>
            )}

            <form onSubmit={agregarDetalleEspecial} className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-600 mb-1">Peso bruto (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={pesoBruto}
                  onChange={(e) => setPesoBruto(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded px-3 py-2"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-600 mb-1">Peso del tuco (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={pesoTuco}
                  onChange={(e) => setPesoTuco(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded px-3 py-2"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-600 mb-1">Neto</label>
                <input
                  type="text"
                  readOnly
                  value={
                    pesoBruto !== '' && pesoTuco !== ''
                      ? (parseFloat(pesoBruto) - parseFloat(pesoTuco)).toFixed(2)
                      : ''
                  }
                  className="w-full border border-slate-300 rounded px-3 py-2 bg-slate-50 text-slate-600"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={enviando}
                  className="bg-green-700 text-white rounded-lg px-5 py-2 font-medium hover:bg-green-800 disabled:opacity-50 whitespace-nowrap"
                >
                  {enviando ? 'Agregando...' : '+ Bobina'}
                </button>
              </div>
            </form>

            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

            {cargando ? (
              <p className="text-slate-500 text-sm">Cargando...</p>
            ) : esDobleLado ? (
              ladoActivo === 'entrada'
                ? <TablaBobinas lista={entradaBobinas} titulo="Bobinas de Entrada" />
                : <TablaBobinas lista={salidaBobinas} titulo="Bobinas de Salida" />
            ) : (
    <TablaBobinas lista={salidaBobinas} titulo="Bobinas de Salida" />
  )}

  <div className="mt-6 pt-5 border-t border-slate-200">
    <h4 className="text-sm font-semibold text-slate-700 mb-3">Detalle de Merma (opcional)</h4>

    <form onSubmit={agregarMerma} className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="flex-1">
        <label className="block text-sm font-medium text-slate-600 mb-1">Peso (kg)</label>
        <input
          type="number"
          step="0.01"
          value={pesoMerma}
          onChange={(e) => setPesoMerma(e.target.value)}
          required
          className="w-full border border-slate-300 rounded px-3 py-2"
        />
      </div>
      <div className="flex-1 relative">
        <label className="block text-sm font-medium text-slate-600 mb-1">Tipo de merma</label>
        <input
          type="text"
          value={tipoMermaInput}
          onChange={(e) => setTipoMermaInput(e.target.value)}
          autoComplete="off"
          className="w-full border border-slate-300 rounded px-3 py-2"
          placeholder="Ej. Refil, Rebaba... "
        />
        {sugerenciasTipoMerma.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {sugerenciasTipoMerma.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTipoMermaInput(t.nombre)
                  setSugerenciasTipoMerma([])
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
              >
                {t.nombre}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-end">
        <button
          type="submit"
          disabled={enviandoMerma}
          className="bg-green-700 text-white rounded-lg px-5 py-2 font-medium hover:bg-green-800 disabled:opacity-50 whitespace-nowrap"
        >
          {enviandoMerma ? 'Agregando...' : '+ Agregar merma'}
        </button>
      </div>
    </form>

    {detallesMerma.length > 0 && (
      <div className="overflow-x-auto bg-slate-50 rounded-lg border border-slate-100">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-2">Peso</th>
              <th className="px-4 py-2">Tipo de merma</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {detallesMerma.map((d) => (
              <tr key={d.id} className="border-t border-slate-200">
                <td className="px-4 py-2">{d.peso} kg</td>
                <td className="px-4 py-2">{d.tipo_merma || 'Sin especificar'}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => eliminarMerma(d.id)}
                    className="text-red-600 hover:text-red-800 text-xs"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
  </>
        ) : (
          <>
            {detalles.length === 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-600 mb-1">Tipo</label>
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full border border-slate-300 rounded px-3 py-2"
                >
                  <option value="bobina">Bobinas</option>
                  <option value="fardo">Fardos</option>
                </select>
              </div>
            )}

            <form onSubmit={agregarDetalleSimple} className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-600 mb-1">Peso (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded px-3 py-2"
                />
              </div>
              {tipo === 'fardo' && (
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-600 mb-1">Millares</label>
                  <input
                    type="number"
                    step="0.01"
                    value={millares}
                    onChange={(e) => setMillares(e.target.value)}
                    required
                    className="w-full border border-slate-300 rounded px-3 py-2"
                  />
                </div>
              )}
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={enviando}
                  className="bg-green-700 text-white rounded-lg px-5 py-2 font-medium hover:bg-green-800 disabled:opacity-50 whitespace-nowrap"
                >
                  {enviando ? 'Agregando...' : `+ ${etiqueta}`}
                </button>
              </div>
            </form>

            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

            {cargando ? (
              <p className="text-slate-500 text-sm">Cargando...</p>
            ) : (
              <div className="overflow-x-auto bg-slate-50 rounded-lg border border-slate-100">
                <table className="min-w-full text-sm text-left">
                  <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-2">N°</th>
                      <th className="px-4 py-2">Peso</th>
                      <th className="px-4 py-2">Millares</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalles.map((d) => (
                      <tr key={d.id} className="border-t border-slate-200">
                        <td className="px-4 py-2">{d.numero}</td>
                        <td className="px-4 py-2">{d.peso_neto}</td>
                        <td className="px-4 py-2">{d.millares ?? '—'}</td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => eliminarDetalle(d.id)}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                    {detalles.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-4 py-4 text-center text-slate-400">
                          Sin registros todavía.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {detalles.length > 0 && (
              <>
                <div className="mt-4 bg-slate-800 text-white rounded-lg px-4 py-3 flex flex-wrap justify-between gap-2 text-sm font-medium">
                  <span>Total: {detalles.length} {etiquetaPlural.toLowerCase()}</span>
                  <span>Peso: {totalPesoSimple.toFixed(2)} kg</span>
                  <span>Millares: {totalMillaresSimple.toFixed(2)}</span>
                </div>

                {(() => {
                  const diferencia = totalPesoSimple - Number(movimiento.salida)
                  const porcentaje = movimiento.salida > 0 ? (diferencia / movimiento.salida) * 100 : 0
                  const esAlarmante = Math.abs(porcentaje) > 5

                  return (
                    <div className={`mt-3 rounded-lg px-4 py-3 text-sm font-medium border ${
                      esAlarmante
                        ? 'bg-red-50 border-red-200 text-red-700'
                        : 'bg-green-50 border-green-200 text-green-700'
                    }`}>
                      <div className="flex justify-between items-center">
                        <span>Diferencia vs. salida declarada</span>
                        <span className="font-bold">
                          {diferencia > 0 ? '+' : ''}{diferencia.toFixed(2)} kg ({porcentaje.toFixed(1)}%)
                        </span>
                      </div>
                      {esAlarmante && (
                        <p className="text-xs mt-1 text-red-600">
                          La diferencia supera el 5% — revisar el registro o la salida declarada.
                        </p>
                      )}
                    </div>
                  )
                })()}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default DetalleMovimiento