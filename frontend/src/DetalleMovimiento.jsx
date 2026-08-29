import { useEffect, useState } from 'react'
import axios from './api'
import MenuAcciones from './MenuAcciones'
import ModalEditar from './ModalEditar'
import { esProduccionOMas } from './roles'

const PROCESOS_ESPECIALES = ['Extrusión', 'Impresión', 'Corte', 'Sellado', 'Laminado']
const PROCESOS_DOBLE_LADO = ['Impresión', 'Corte', 'Sellado', 'Laminado']
const PROCESOS_SALIDA_FARDO = ['Sellado']

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
const MATERIALES_EXTRUSION = [
  'LINEAL', 'BAJA (PEBD)', 'MASTERBACH', 'USO PESADO', 'ALTA DENSIDAD',
  'METALOCENO', 'PELETIZADO NEGRO', 'MASTER BLANCO', 'CARAMELO',
  'AGLOMERADO', 'NEGRO', 'OTROS'
]

function DetalleMovimiento({ movimiento, orden, onCerrar }) {
  const esExtrusion = movimiento.proceso === 'Extrusión'
  const esDobleLado = PROCESOS_DOBLE_LADO.includes(movimiento.proceso)
  const esProcesoEspecial = PROCESOS_ESPECIALES.includes(movimiento.proceso)  

  const [detallesMerma, setDetallesMerma] = useState([])
  const [pesoMerma, setPesoMerma] = useState('')
  const [tipoMermaInput, setTipoMermaInput] = useState('')
  const [sugerenciasTipoMerma, setSugerenciasTipoMerma] = useState([])
  const [enviandoMerma, setEnviandoMerma] = useState(false)
  const [editandoMerma, setEditandoMerma] = useState(null)
  const [guardandoMerma, setGuardandoMerma] = useState(false)
  const [ladoActivo, setLadoActivo] = useState('salida')
  const [tipo, setTipo] = useState('bobina')
  const [detalles, setDetalles] = useState([])
  const [cargando, setCargando] = useState(true)
  const [pesoBruto, setPesoBruto] = useState('')
  const [pesoTuco, setPesoTuco] = useState('')
  const [peso, setPeso] = useState('')
  const [pesoFardo, setPesoFardo] = useState('')
  const [millaresFardo, setMillaresFardo] = useState('')
  const [millares, setMillares] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState(null)
  const salidaEsFardo = PROCESOS_SALIDA_FARDO.includes(movimiento.proceso)
  const [importando, setImportando] = useState(false)
  const esExtrusionReal = movimiento.proceso === 'Extrusión'
  const [materialSeleccionado, setMaterialSeleccionado] = useState('')
  const [cantidadMaterial, setCantidadMaterial] = useState('')
  const [enviandoMaterial, setEnviandoMaterial] = useState(false)
  const [tipoMaterial, setTipoMaterial] = useState('')
  const [sugerenciasTipoMaterial, setSugerenciasTipoMaterial] = useState([])

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
    if (movimiento.proceso !== 'Laminado' || tipoMaterial.trim().length < 2) {
      setSugerenciasTipoMaterial([])
      return
    }
    const temporizador = setTimeout(() => {
      axios.get(`https://packtech-production.up.railway.app/tipos-merma/materiales/buscar?q=${tipoMaterial}`)
        .then((res) => setSugerenciasTipoMaterial(res.data))
        .catch((err) => console.error(err))
    }, 300)
    return () => clearTimeout(temporizador)
  }, [tipoMaterial, movimiento.proceso])

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

  const detallesLado = (lado) => detalles.filter(d => d.lado === lado && d.tipo !== 'material')
  const sumaNeto = (lista) => lista.reduce((s, d) => s + Number(d.peso_neto), 0)

  const entradaBobinas = detallesLado('entrada')
  const salidaBobinas = detallesLado('salida')

  const entradaCalculada = esDobleLado ? sumaNeto(entradaBobinas) : Number(movimiento.entrada)
  const salidaCalculada = esProcesoEspecial ? sumaNeto(salidaBobinas) : Number(movimiento.salida)
  const totalMermaDetallada = detallesMerma.reduce((s, d) => s + Number(d.peso), 0)
  const diferenciaReal = entradaCalculada - (salidaCalculada + totalMermaDetallada)

  const agregarFardoSalida = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError(null)

    const siguienteNumero = salidaBobinas.length + 1

    try {
      await axios.post(`https://packtech-production.up.railway.app/movimientos/${movimiento.id}/detalles`, {
        tipo: 'fardo',
        lado: 'salida',
        numero: siguienteNumero,
        peso_bruto: parseFloat(pesoFardo),
        peso_tuco: 0,
        millares: parseFloat(millaresFardo)
      })
      setPesoFardo('')
      setMillaresFardo('')
      cargarDetalles()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al agregar el fardo.')
    } finally {
      setEnviando(false)
    }
  }

  const materialesUsados = detalles.filter((d) => d.tipo === 'material')

  const agregarMaterial = async (e) => {
    e.preventDefault()
    if (!materialSeleccionado) return
    setEnviandoMaterial(true)
    setError(null)
    try {
      const siguienteNumero = materialesUsados.length + 1
      await axios.post(`https://packtech-production.up.railway.app/movimientos/${movimiento.id}/detalles`, {
        tipo: 'material',
        lado: 'entrada',
        numero: siguienteNumero,
        peso_bruto: parseFloat(cantidadMaterial),
        peso_tuco: 0,
        millares: null,
        tipo_material: materialSeleccionado
      })
      setMaterialSeleccionado('')
      setCantidadMaterial('')
      cargarDetalles()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al agregar el material.')
    } finally {
      setEnviandoMaterial(false)
    }
  }

  const agregarDetalleEspecial = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError(null)

    const lado = esDobleLado ? ladoActivo : 'salida'
    const siguienteNumero = detallesLado(lado).length + 1
    const esMaterialAplicable = movimiento.proceso === 'Laminado' && lado === 'entrada'

    try {
      await axios.post(`https://packtech-production.up.railway.app/movimientos/${movimiento.id}/detalles`, {
        tipo: 'bobina',
        lado,
        numero: siguienteNumero,
        peso_bruto: parseFloat(pesoBruto),
        peso_tuco: parseFloat(pesoTuco) || 0,
        millares: null,
        tipo_material: esMaterialAplicable ? (tipoMaterial.trim() || null) : null
      })
      setPesoBruto('')
      setPesoTuco('')
      setTipoMaterial('')
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

  const importarBobinasAnteriores = async () => {
    setImportando(true)
    setError(null)
    try {
      const res = await axios.post(`https://packtech-production.up.railway.app/movimientos/${movimiento.id}/detalles/importar-anteriores`)
      cargarDetalles()
      alert(`Se importaron ${res.data.importadas} bobina(s) del proceso anterior.`)
    } catch (err) {
      setError(err.response?.data?.detail || 'No se pudieron importar las bobinas del proceso anterior.')
    } finally {
      setImportando(false)
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

const abrirEdicionMerma = (detalle) => {
  setEditandoMerma({ id: detalle.id, peso: detalle.peso, tipo_merma: detalle.tipo_merma || '' })
}

const guardarEdicionMerma = async () => {
  setGuardandoMerma(true)
  try {
    await axios.put(`https://packtech-production.up.railway.app/mermas/${editandoMerma.id}`, {
      peso: parseFloat(editandoMerma.peso),
      tipo_merma: editandoMerma.tipo_merma || null
    })
    setEditandoMerma(null)
    cargarDetallesMerma()
  } catch (err) {
    alert(err.response?.data?.detail || 'Error al editar la merma.')
  } finally {
    setGuardandoMerma(false)
  }
}

const duplicarMerma = (detalle) => {
  setPesoMerma(String(detalle.peso))
  setTipoMermaInput(detalle.tipo_merma || '')
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

  const totalPesoSimple = detalles.reduce((s, d) => s + Number(d.peso_neto), 0)
  const totalMillaresSimple = detalles.reduce((s, d) => s + Number(d.millares || 0), 0)
  const etiqueta = tipo === 'bobina' ? 'Bobina' : 'Fardo'
  const etiquetaPlural = tipo === 'bobina' ? 'Bobinas' : 'Fardos'

  const TablaBobinas = ({ lista, titulo, mostrarMillares, mostrarMaterial }) => (
    <div className="mb-5">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold text-slate-700">{titulo}</h4>
        <span className="text-xs text-slate-400">
          {lista.length} {mostrarMillares ? 'fardo' : 'bobina'}{lista.length !== 1 ? 's' : ''} · {sumaNeto(lista).toFixed(2)} kg neto
        </span>
      </div>
      <div className="overflow-x-auto bg-slate-50 rounded-lg border border-slate-100">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-2">N°</th>
              {mostrarMillares ? (
                <>
                  <th className="px-4 py-2">Peso</th>
                  <th className="px-4 py-2">Millares</th>
                </>
              ) : (
                <>
                  <th className="px-4 py-2">Bruto</th>
                  <th className="px-4 py-2">Tuco</th>
                  <th className="px-4 py-2">Peso Neto</th>
                  {mostrarMaterial && <th className="px-4 py-2">Material</th>}
                </>
              )}
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((d) => (
              <tr key={d.id} className="border-t border-slate-200">
                <td className="px-4 py-2">{d.numero}</td>
                {mostrarMillares ? (
                  <>
                    <td className="px-4 py-2 font-medium text-slate-800">{d.peso_neto}</td>
                    <td className="px-4 py-2">{d.millares}</td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2">{d.peso_bruto}</td>
                    <td className="px-4 py-2">{d.peso_tuco}</td>
                    <td className="px-4 py-2 font-medium text-slate-800">{d.peso_neto}</td>
                    {mostrarMaterial && <td className="px-4 py-2">{d.tipo_material || '—'}</td>}
                  </>
                )}
                <td className="px-4 py-2 text-right">
                  {esProduccionOMas() && (
                    <button
                      onClick={() => eliminarDetalle(d.id)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      Eliminar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr>
                <td colSpan={mostrarMillares ? 4 : (mostrarMaterial ? 6 : 5)} className="px-4 py-4 text-center text-slate-400">
                  Sin registros todavía.
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
            {(movimiento.hora_inicio || movimiento.hora_fin) && (
              <div className="inline-flex items-center gap-1.5 mt-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-full px-3 py-1 text-xs font-medium">
                <span>⏱</span>
                <span>{movimiento.hora_inicio || '—'}</span>
                <span className="text-amber-400">→</span>
                <span>{movimiento.hora_fin || '—'}</span>
                {calcularDuracion(movimiento.hora_inicio, movimiento.hora_fin) && (
                  <span className="ml-1 bg-amber-100 rounded-full px-2 py-0.5">
                    {calcularDuracion(movimiento.hora_inicio, movimiento.hora_fin)}
                  </span>
                )}
              </div>
            )}
          </div>
          <button onClick={onCerrar} className="text-slate-400 hover:text-slate-700 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
            <p className="text-xs text-slate-400 uppercase tracking-wide">{esDobleLado ? 'Entrada (neto)' : 'Entrada'}</p>
            <p className="text-sm font-semibold text-slate-800">{entradaCalculada.toFixed(2)} {movimiento.unidad}</p>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
            <p className="text-xs text-slate-400 uppercase tracking-wide">{esProcesoEspecial ? 'Salida (neto)' : 'Salida'}</p>
            <p className="text-sm font-semibold text-slate-800">{salidaCalculada.toFixed(2)} {movimiento.unidad}</p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
            <p className="text-xs text-blue-500 uppercase tracking-wide">Faltante/Sobrante</p>
            <p className="text-sm font-semibold text-blue-800">
              {diferenciaReal.toFixed(2)} {movimiento.unidad}
            </p>
            <p className="text-[11px] text-blue-400 mt-0.5">Entrada − (Salida + Merma real)</p>
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
            {esProduccionOMas() && esExtrusionReal && (
              <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mb-5">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Materiales usados</h4>
                <form onSubmit={agregarMaterial} className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-600 mb-1">Tipo de material</label>
                    <select
                      value={materialSeleccionado}
                      onChange={(e) => setMaterialSeleccionado(e.target.value)}
                      required
                      className="w-full border border-slate-300 rounded px-3 py-2 bg-white"
                    >
                      <option value="">Seleccionar...</option>
                      {MATERIALES_EXTRUSION.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-600 mb-1">Cantidad (kg)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={cantidadMaterial}
                      onChange={(e) => setCantidadMaterial(e.target.value)}
                      required
                      className="w-full border border-slate-300 rounded px-3 py-2"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={enviandoMaterial}
                      className="bg-green-700 text-white rounded-lg px-5 py-2 font-medium hover:bg-green-800 disabled:opacity-50 whitespace-nowrap"
                    >
                      {enviandoMaterial ? 'Agregando...' : '+ Material'}
                    </button>
                  </div>
                </form>

                {materialesUsados.length > 0 && (
                  <div className="overflow-x-auto bg-white rounded-lg border border-slate-100">
                    <table className="min-w-full text-sm text-left">
                      <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                        <tr>
                          <th className="px-4 py-2">Material</th>
                          <th className="px-4 py-2">Cantidad</th>
                          <th className="px-4 py-2"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {materialesUsados.map((m) => (
                          <tr key={m.id} className="border-t border-slate-200">
                            <td className="px-4 py-2 font-medium text-slate-800">{m.tipo_material}</td>
                            <td className="px-4 py-2">{m.peso_bruto} kg</td>
                            <td className="px-4 py-2 text-right">
                              <button
                                onClick={() => eliminarDetalle(m.id)}
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
            )}

            {esProduccionOMas() && esDobleLado && (
              <div className="flex justify-between items-center mb-4 border-b border-slate-200">
                <div className="flex gap-2">
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
                    {salidaEsFardo ? 'Fardos de Salida' : 'Bobinas de Salida'}
                  </button>
                </div>

                {esProduccionOMas() && ladoActivo === 'entrada' && entradaBobinas.length === 0 && (
                  <button
                    onClick={importarBobinasAnteriores}
                    disabled={importando}
                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 mb-2"
                  >
                    {importando ? 'Trayendo...' : '↓ Traer bobinas del proceso anterior'}
                  </button>
                )}
              </div>
            )}

            {esProduccionOMas() && (salidaEsFardo && ladoActivo === 'salida' ? (
  <form onSubmit={agregarFardoSalida} className="flex flex-col sm:flex-row gap-3 mb-6">
    <div className="flex-1">
      <label className="block text-sm font-medium text-slate-600 mb-1">Peso (kg)</label>
      <input
        type="number"
        step="0.01"
        value={pesoFardo}
        onChange={(e) => setPesoFardo(e.target.value)}
        required
        className="w-full border border-slate-300 rounded px-3 py-2"
      />
    </div>
    <div className="flex-1">
      <label className="block text-sm font-medium text-slate-600 mb-1">Millares</label>
      <input
        type="number"
        step="0.01"
        value={millaresFardo}
        onChange={(e) => setMillaresFardo(e.target.value)}
        required
        className="w-full border border-slate-300 rounded px-3 py-2"
      />
    </div>
    <div className="flex items-end">
      <button
        type="submit"
        disabled={enviando}
        className="bg-green-700 text-white rounded-lg px-5 py-2 font-medium hover:bg-green-800 disabled:opacity-50 whitespace-nowrap"
      >
        {enviando ? 'Agregando...' : '+ Fardo'}
      </button>
    </div>
  </form>
) : (
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
        <label className="block text-sm font-medium text-slate-600 mb-1">Peso Neto</label>
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
      {movimiento.proceso === 'Laminado' && ladoActivo === 'entrada' && (
  <div className="flex-1 relative">
    <label className="block text-sm font-medium text-slate-600 mb-1">Tipo de material</label>
    <input
      type="text"
      value={tipoMaterial}
      onChange={(e) => setTipoMaterial(e.target.value)}
      autoComplete="off"
      className="w-full border border-slate-300 rounded px-3 py-2"
      placeholder="Ej. PET, Uso pesado, Baja..."
    />
    {sugerenciasTipoMaterial.length > 0 && (
      <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
        {sugerenciasTipoMaterial.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setTipoMaterial(m.nombre)
              setSugerenciasTipoMaterial([])
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
          >
            {m.nombre}
          </button>
        ))}
      </div>
    )}
  </div>
)}
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
  ))}

            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

            {cargando ? (
              <p className="text-slate-500 text-sm">Cargando...</p>
            ) : esDobleLado ? (
              ladoActivo === 'entrada'
                ? <TablaBobinas lista={entradaBobinas} titulo="Bobinas de Entrada" mostrarMillares={false} mostrarMaterial={movimiento.proceso === 'Laminado'} />
                : <TablaBobinas lista={salidaBobinas} titulo="Fardos de Salida" mostrarMillares={salidaEsFardo} />
            ) : (
              <TablaBobinas lista={salidaBobinas} titulo="Bobinas de Salida" mostrarMillares={false} />
            )}
  <div className="mt-6 pt-5 border-t border-slate-200">
    <h4 className="text-sm font-semibold text-slate-700 mb-3">Detalle de Merma (opcional)</h4>

    {esProduccionOMas() && (
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
    )}

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
                <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                  {esProduccionOMas() && (
                    <MenuAcciones
                      onEditar={() => abrirEdicionMerma(d)}
                      onDuplicar={() => duplicarMerma(d)}
                      onEliminar={() => eliminarMerma(d.id)}
                    />
                  )}
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
            {esProduccionOMas() && detalles.length === 0 && (
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

            {esProduccionOMas() && (
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
            )}

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
                          {esProduccionOMas() && (
                            <button
                              onClick={() => eliminarDetalle(d.id)}
                              className="text-red-600 hover:text-red-800 text-xs"
                            >
                              Eliminar
                            </button>
                          )}
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

      {editandoMerma && (
        <ModalEditar
          titulo="Editar Merma"
          campos={[
            { name: 'peso', label: 'Peso (kg)', type: 'number' },
            { name: 'tipo_merma', label: 'Tipo de merma' }
          ]}
          valores={editandoMerma}
          onCambio={(campo, valor) => setEditandoMerma({ ...editandoMerma, [campo]: valor })}
          onGuardar={guardarEdicionMerma}
          onCerrar={() => setEditandoMerma(null)}
          guardando={guardandoMerma}
        />
      )}
    </div>
  )
}

export default DetalleMovimiento