import { useEffect, useState } from 'react'
import axios from './api'
import MenuAcciones from './MenuAcciones'
import ModalEditar from './ModalEditar'
import DetalleMovimiento from './DetalleMovimiento'
import FiltroDesplegable from './FiltroDesplegable'
import { puedeCrear, esProduccionOMas } from './roles'
import { PERIODOS_RAPIDOS, cargarFiltros, guardarFiltros } from './filtrosPersistentes'
import { generarPDFMovimientos } from './GenerarPDFRegistros'

const formatearFecha = (fecha) => {
  if (!fecha) return ''
  const [anio, mes, dia] = fecha.split('-')
  return `${dia}/${mes}/${anio.slice(2)}`
}

const MAQUINAS_POR_PROCESO = {
  'Extrusión': ['Extrusora-01', 'Extrusora-02', 'Extrusora-03'],
  'Laminado': ['Laminadora-01', 'Laminadora-02'],
  'Impresión': ['Impresora-01', 'Impresora-02', 'Impresora-03'],
  'Sellado': [
    'Selladora-01', 'Selladora-02', 'Selladora-03',
    'Selladora-04', 'Selladora-05', 'Selladora-06', 'Selladora-07', 'Selladora-08'
  ],
  'Corte': ['Cortadora-01', 'Cortadora-02']
}

const PROCESOS_ESPECIALES = ['Extrusión', 'Impresión', 'Corte', 'Sellado', 'Laminado']
const PROCESOS_DOBLE_LADO = ['Impresión', 'Corte', 'Sellado', 'Laminado']
const CLAVE_FILTROS_MOVIMIENTOS = 'packtech_filtros_movimientos'

function Movimientos() {
  const filtrosGuardados = cargarFiltros(CLAVE_FILTROS_MOVIMIENTOS, {
    codigo: '', cliente: '', proceso: '', operario: '', maquina: '', periodo: 'todo', desde: '', hasta: ''
  })

  const [movimientos, setMovimientos] = useState([])
  const [ordenes, setOrdenes] = useState([])
  const [operarios, setOperarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [busquedaOrden, setBusquedaOrden] = useState('')
  const [sugerenciasOrdenes, setSugerenciasOrdenes] = useState([])
  const [ordenSeleccionada, setOrdenSeleccionada] = useState(null)
  const [busquedaOperario, setBusquedaOperario] = useState('')
  const [sugerenciasOperarios, setSugerenciasOperarios] = useState([])
  const [operarioSeleccionado, setOperarioSeleccionado] = useState(null)
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [filtroCodigo, setFiltroCodigo] = useState(filtrosGuardados.codigo)
  const [filtroProceso, setFiltroProceso] = useState(filtrosGuardados.proceso || null)
  const [filtroOperario, setFiltroOperario] = useState(filtrosGuardados.operario || null)
  const [filtroMaquina, setFiltroMaquina] = useState(filtrosGuardados.maquina || null)
  const [maquinasUnicas, setMaquinasUnicas] = useState([])
  const [periodo, setPeriodo] = useState(filtrosGuardados.periodo)
  const [fechaDesde, setFechaDesde] = useState(filtrosGuardados.desde)
  const [fechaHasta, setFechaHasta] = useState(filtrosGuardados.hasta)
  const [filtroCliente, setFiltroCliente] = useState(filtrosGuardados.cliente)
  const [sugerenciasTipoLaminado, setSugerenciasTipoLaminado] = useState([])
  const [sugerenciasTipoMerma, setSugerenciasTipoMerma] = useState([])

const horaActualLima = () => {
  return new Date().toLocaleTimeString('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
}

  const [form, setForm] = useState({
    orden_id: '',
    proceso: '',
    nombre_operario: '',
    maquina: '',
    entrada: '',
    salida: '',
    unidad: 'kg',
    tipo_laminado: '',
    hora_inicio: horaActualLima(),
    hora_fin: '',
    observacion: ''
  })

  const [enviando, setEnviando] = useState(false)
  const [errorForm, setErrorForm] = useState(null)
  const [movimientoAbierto, setMovimientoAbierto] = useState(null)

  const esProcesoEspecial = PROCESOS_ESPECIALES.includes(form.proceso)

  const [hayMasMovimientos, setHayMasMovimientos] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [descargandoPDF, setDescargandoPDF] = useState(false)

  const cargarDatos = async () => {
    setCargando(true)
    try {
      const [ordRes, opRes, maqRes] = await Promise.all([
        axios.get('https://packtech-production.up.railway.app/ordenes-produccion?limit=500'),
        axios.get('https://packtech-production.up.railway.app/operarios?limit=1000'),
        axios.get('https://packtech-production.up.railway.app/movimientos/maquinas')
      ])

      setOrdenes(ordRes.data)
      setOperarios(opRes.data)
      setMaquinasUnicas(maqRes.data)
      setError(null)
      await cargarMovimientos()
    } catch (err) {
      console.error(err)
      setError('No se pudo conectar con el backend.')
    } finally {
      setCargando(false)
    }
  }

  const rangoPeriodo = () => {
    if (periodo === 'custom') return { desde: fechaDesde, hasta: fechaHasta }
    const p = PERIODOS_RAPIDOS.find((x) => x.id === periodo) || PERIODOS_RAPIDOS[0]
    return { desde: p.desde(), hasta: p.hasta() }
  }

  const paramsFiltroMovimientos = () => {
    const { desde, hasta } = rangoPeriodo()
    return {
      q: filtroCodigo.trim() || filtroCliente.trim() || undefined,
      proceso: filtroProceso || undefined,
      maquina: filtroMaquina || undefined,
      operario: filtroOperario || undefined,
      fecha_desde: desde || undefined,
      fecha_hasta: hasta || undefined
    }
  }

  const cargarMovimientos = async () => {
    try {
      const res = await axios.get('https://packtech-production.up.railway.app/movimientos/filtrar', {
        params: { ...paramsFiltroMovimientos(), limit: 20 }
      })
      setMovimientos(res.data)
      setHayMasMovimientos(res.data.length === 20)
    } catch (err) {
      console.error(err)
      setError('No se pudo conectar con el backend.')
    }
  }

  const cargarMasMovimientos = async () => {
    if (movimientos.length === 0) return
    setCargandoMas(true)
    try {
      const ultimoId = movimientos[movimientos.length - 1].id
      const res = await axios.get('https://packtech-production.up.railway.app/movimientos/filtrar', {
        params: { ...paramsFiltroMovimientos(), limit: 20, antes_de: ultimoId }
      })
      setMovimientos((actual) => [...actual, ...res.data])
      setHayMasMovimientos(res.data.length === 20)
    } catch (err) {
      console.error(err)
    } finally {
      setCargandoMas(false)
    }
  }

  const descargarMovimientosPDF = async () => {
    setDescargandoPDF(true)
    try {
      let todos = []
      let antesDe = undefined
      while (true) {
        const res = await axios.get('https://packtech-production.up.railway.app/movimientos/filtrar', {
          params: { ...paramsFiltroMovimientos(), limit: 200, antes_de: antesDe }
        })
        todos = [...todos, ...res.data]
        if (res.data.length < 200) break
        antesDe = res.data[res.data.length - 1].id
      }

      if (todos.length === 0) {
        alert('No hay movimientos que coincidan con los filtros para descargar.')
        return
      }

      const filas = todos.map((mov) => {
        const orden = ordenes.find((o) => o.id === mov.orden_id)
        return {
          codigo: orden?.codigo || mov.orden_id,
          cliente: orden?.cliente || '—',
          proceso: mov.proceso,
          maquina: mov.maquina || '—',
          operario: mov.operario_id ? nombreOperario(mov.operario_id) : '—',
          entrada: mov.entrada,
          salida: mov.salida,
          fecha: mov.fecha,
          hora: mov.hora
        }
      })

      const p = PERIODOS_RAPIDOS.find((x) => x.id === periodo) || PERIODOS_RAPIDOS[0]
      const { desde, hasta } = rangoPeriodo()

      generarPDFMovimientos(filas, {
        periodoLabel: periodo === 'custom' ? 'Personalizado' : p.label,
        desde,
        hasta,
        filtros: {
          codigo: filtroCodigo, cliente: filtroCliente, proceso: filtroProceso, operario: filtroOperario, maquina: filtroMaquina
        }
      })
    } catch (err) {
      console.error(err)
      alert('No se pudo generar el PDF de movimientos.')
    } finally {
      setDescargandoPDF(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  // Persiste los filtros para que sobrevivan cambios de pestaña y recargas de página
  useEffect(() => {
    guardarFiltros(CLAVE_FILTROS_MOVIMIENTOS, {
      codigo: filtroCodigo, cliente: filtroCliente, proceso: filtroProceso || '',
      operario: filtroOperario || '', maquina: filtroMaquina || '',
      periodo, desde: fechaDesde, hasta: fechaHasta
    })
  }, [filtroCodigo, filtroCliente, filtroProceso, filtroOperario, filtroMaquina, periodo, fechaDesde, fechaHasta])

  // Recarga desde el backend cada vez que cambia cualquier filtro (con debounce en texto libre)
  useEffect(() => {
    const t = setTimeout(() => {
      cargarMovimientos()
    }, 300)
    return () => clearTimeout(t)
  }, [filtroCodigo, filtroCliente, filtroProceso, filtroOperario, filtroMaquina, periodo, fechaDesde, fechaHasta])

  const nombreOperario = (id) => {
    if (!id) return ''
    return operarios.find(o => o.id === id)?.nombre || ''
  }

  const eliminarMovimiento = async (id) => {
    if (!confirm('¿Seguro que quieres eliminar este movimiento?')) return
    try {
      await axios.delete(`https://packtech-production.up.railway.app/movimientos/${id}`)
      cargarMovimientos()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al eliminar el movimiento.')
    }
  }

  const duplicarMovimiento = (mov) => {
    const codigoOrden = ordenes.find(o => o.id === mov.orden_id)?.codigo || ''
    const nombreOp = nombreOperario(mov.operario_id)

    setForm({
      orden_id: mov.orden_id,
      proceso: mov.proceso,
      nombre_operario: nombreOp,
      maquina: mov.maquina || '',
      entrada: mov.entrada || '',
      salida: mov.salida || '',
      unidad: mov.unidad || 'kg',
      tipo_laminado: mov.tipo_laminado || '',
      hora_inicio: horaActualLima(),
      hora_fin: '',
      observacion: mov.observacion || ''
    })

    setBusquedaOrden(codigoOrden)
    setOrdenSeleccionada(codigoOrden ? { id: mov.orden_id, codigo: codigoOrden } : null)
    setBusquedaOperario(nombreOp)
    setOperarioSeleccionado(nombreOp ? { nombre: nombreOp } : null)

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const abrirEdicion = (mov) => {
    setEditando({
      id: mov.id,
      orden_id: ordenes.find(o => o.id === mov.orden_id)?.codigo || mov.orden_id,
      proceso: mov.proceso,
      nombre_operario: nombreOperario(mov.operario_id),
      maquina: mov.maquina,
      entrada: mov.entrada,
      salida: mov.salida,
      unidad: mov.unidad,
      observacion: mov.observacion || '',
      hora_inicio: mov.hora_inicio || '',
      hora_fin: mov.hora_fin || horaActualLima(),
      esEspecial: PROCESOS_ESPECIALES.includes(mov.proceso)
    })
  }

const guardarEdicion = async () => {
    setGuardando(true)
    try {
      await axios.put(`https://packtech-production.up.railway.app/movimientos/${editando.id}`, {
        codigo_orden: editando.orden_id,
        proceso: editando.proceso,
        nombre_operario: editando.nombre_operario,
        maquina: editando.maquina,
        unidad: editando.unidad,
        entrada: editando.esEspecial ? null : (parseFloat(editando.entrada) || 0),
        salida: editando.esEspecial ? null : (parseFloat(editando.salida) || 0),
        observacion: editando.observacion || null,
        hora_inicio: editando.hora_inicio || null,
        hora_fin: editando.hora_fin || null
      })

      setEditando(null)
      cargarMovimientos()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al editar el movimiento.')
    } finally {
      setGuardando(false)
    }
  }

  const manejarCambio = (e) => {
    const { name, value } = e.target

    if (name === 'proceso') {
      setForm({ ...form, proceso: value, maquina: '', entrada: '', salida: '', tipo_laminado: '' })
      return
    }

    setForm({ ...form, [name]: value })
  }

  const manejarEnvio = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setErrorForm(null)

    const payload = {
      orden_id: parseInt(form.orden_id),
      proceso: form.proceso,
      nombre_operario: form.nombre_operario.trim(),
      maquina: form.maquina,
      entrada: esProcesoEspecial ? 0 : (parseFloat(form.entrada) || 0),
      salida: esProcesoEspecial ? 0 : (parseFloat(form.salida) || 0),
      unidad: form.unidad,
      tipo_laminado: form.proceso === 'Laminado' ? (form.tipo_laminado?.trim() || null) : null,
      hora_inicio: form.hora_inicio || null,
      hora_fin: form.hora_fin || null,
      observacion: form.observacion || null
    }

    try {
      const respuesta = await axios.post('https://packtech-production.up.railway.app/movimientos', payload)

      setForm({
        orden_id: '',
        proceso: '',
        nombre_operario: '',
        maquina: '',
        entrada: '',
        salida: '',
        unidad: 'kg',
        tipo_laminado: '',
        hora_inicio: horaActualLima(),
        hora_fin: '',
        observacion: ''
      })
      setBusquedaOrden('')
      setOrdenSeleccionada(null)
      setBusquedaOperario('')
      setOperarioSeleccionado(null)

      cargarMovimientos()

      if (esProcesoEspecial) {
        setMovimientoAbierto(respuesta.data)
      }
    } catch (err) {
      const mensaje = err.response?.data?.detail || 'Error al registrar el movimiento.'
      setErrorForm(mensaje)
    } finally {
      setEnviando(false)
    }
  }

  const maquinasDisponibles = form.proceso ? MAQUINAS_POR_PROCESO[form.proceso] || [] : []

  useEffect(() => {
    if (form.proceso !== 'Laminado' || form.tipo_laminado.trim().length < 2) {
      setSugerenciasTipoLaminado([])
      return
    }
    const temporizador = setTimeout(() => {
      axios.get(`https://packtech-production.up.railway.app/tipos-merma/buscar?proceso=Laminado&q=${form.tipo_laminado}`)
        .then((res) => setSugerenciasTipoLaminado(res.data))
        .catch((err) => console.error(err))
    }, 300)
    return () => clearTimeout(temporizador)
  }, [form.tipo_laminado, form.proceso])

  useEffect(() => {
    if (busquedaOrden.trim().length < 2 || ordenSeleccionada) {
      setSugerenciasOrdenes([])
      return
    }
    const temporizador = setTimeout(() => {
      axios.get(`https://packtech-production.up.railway.app/ordenes-produccion/buscar?q=${busquedaOrden}`)
        .then((res) => setSugerenciasOrdenes(res.data))
        .catch((err) => console.error(err))
    }, 300)
    return () => clearTimeout(temporizador)
  }, [busquedaOrden, ordenSeleccionada])

  useEffect(() => {
    if (busquedaOperario.trim().length < 2 || operarioSeleccionado) {
      setSugerenciasOperarios([])
      return
    }
    const temporizador = setTimeout(() => {
      axios.get(`https://packtech-production.up.railway.app/operarios/buscar?q=${busquedaOperario}`)
        .then((res) => setSugerenciasOperarios(res.data))
        .catch((err) => console.error(err))
    }, 300)
    return () => clearTimeout(temporizador)
  }, [busquedaOperario, operarioSeleccionado])

  useEffect(() => {
    if (!esProcesoEspecial || form.proceso === 'Laminado') {
      setSugerenciasTipoMerma([])
      return
    }
    return
  }, [form.proceso, esProcesoEspecial])

  const operariosUnicos = [...new Set(operarios.map((o) => o.nombre))].sort()

  const hayFiltrosActivos = filtroCodigo || filtroCliente || filtroProceso || filtroOperario || filtroMaquina || periodo !== 'todo'

  const limpiarFiltros = () => {
    setFiltroCodigo('')
    setFiltroCliente('')
    setFiltroProceso(null)
    setFiltroOperario(null)
    setFiltroMaquina(null)
    setPeriodo('todo')
    setFechaDesde('')
    setFechaHasta('')
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Movimientos</h1>
        <p className="text-slate-500 text-sm mt-1">Registra y consulta el avance de producción por proceso.</p>
      </div>

      {puedeCrear() && (
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">
          Registrar Movimiento
        </h2>

        <form onSubmit={manejarEnvio} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Número de Pedido
              </label>
              <input
                type="text"
                value={busquedaOrden}
                onChange={(e) => {
                  setBusquedaOrden(e.target.value)
                  setOrdenSeleccionada(null)
                  setForm({ ...form, orden_id: '' })
                }}
                required
                autoComplete="off"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                placeholder="Escribe el código (ej. OP-001)"
              />
              {sugerenciasOrdenes.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {sugerenciasOrdenes.map((orden) => (
                    <button
                      key={orden.id}
                      type="button"
                      onClick={() => {
                        setOrdenSeleccionada(orden)
                        setBusquedaOrden(orden.codigo)
                        setForm({ ...form, orden_id: orden.id })
                        setSugerenciasOrdenes([])
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 border-b border-slate-100 last:border-0 transition-colors"
                    >
                      <span className="font-medium text-slate-800">{orden.codigo}</span>
                      <span className="text-slate-400"> · {orden.cliente}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 relative">
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Operario
              </label>
              <input
                type="text"
                value={busquedaOperario}
                onChange={(e) => {
                  setBusquedaOperario(e.target.value)
                  setOperarioSeleccionado(null)
                  setForm({ ...form, nombre_operario: e.target.value })
                }}
                required
                autoComplete="off"
                className="w-full border border-slate-300 rounded px-3 py-2"
                placeholder="Escribe un nombre"
              />
              {sugerenciasOperarios.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {sugerenciasOperarios.map((op) => (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => {
                        setOperarioSeleccionado(op)
                        setBusquedaOperario(op.nombre)
                        setForm({ ...form, nombre_operario: op.nombre })
                        setSugerenciasOperarios([])
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                    >
                      <span className="font-medium text-slate-800">{op.nombre}</span>
                      {op.cargo && <span className="text-slate-400"> · {op.cargo}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
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

          {esProcesoEspecial ? (
            <>
              {form.proceso === 'Extrusión' && (
                <p className="text-sm text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                  La entrada se calcula automáticamente sumando los materiales que registres en el siguiente paso.
                </p>
              )}

              {PROCESOS_DOBLE_LADO.includes(form.proceso) && (
                <p className="text-sm text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                  La entrada y salida se calculan a partir de las bobinas que registres en el siguiente paso.
                </p>
              )}

              {form.proceso === 'Laminado' && (
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Tipo de laminado
                  </label>
                  <input
                    type="text"
                    value={form.tipo_laminado}
                    onChange={(e) => setForm({ ...form, tipo_laminado: e.target.value })}
                    autoComplete="off"
                    className="w-full border border-slate-300 rounded px-3 py-2"
                    placeholder="Ej. BOPP/PE, Metalizado..."
                  />
                  {sugerenciasTipoLaminado.length > 0 && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {sugerenciasTipoLaminado.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setForm({ ...form, tipo_laminado: t.nombre })
                            setSugerenciasTipoLaminado([])
                          }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0"
                        >
                          {t.nombre}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <p className="text-sm text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                La merma se registra en detalle (por tipo) en el siguiente paso.
              </p>
            </>
          ) : null}

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Hora de inicio
              </label>
              <input
                type="time"
                name="hora_inicio"
                value={form.hora_inicio}
                onChange={manejarCambio}
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
              <p className="text-xs text-slate-400 mt-1">Se completa con la hora actual, puedes cambiarla.</p>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Hora de fin (opcional)
              </label>
              <input
                type="time"
                name="hora_fin"
                value={form.hora_fin}
                onChange={manejarCambio}
                className="w-full border border-slate-300 rounded px-3 py-2"
              />
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
              placeholder="Fallo de máquina / Cambio de bobina / Otro"
            />
          </div>

          {errorForm && <p className="text-red-600 text-sm">{errorForm}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-green-700 text-white rounded-lg py-2.5 font-medium hover:bg-green-800 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {enviando ? 'Guardando...' : esProcesoEspecial ? 'Continuar a Bobinas' : 'Registrar Movimiento'}
          </button>
        </form>
      </div>
      )}

      <div>
        {cargando && <p className="text-slate-500">Cargando...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!cargando && !error && (
          <>
            <div className="space-y-3 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                {PERIODOS_RAPIDOS.map((p) => (
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
                  <div className="flex items-center gap-1.5 text-sm text-slate-500">
                    <span>Desde</span>
                    <input
                      type="date"
                      value={fechaDesde}
                      onChange={(e) => setFechaDesde(e.target.value)}
                      className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                    />
                    <span>hasta</span>
                    <input
                      type="date"
                      value={fechaHasta}
                      onChange={(e) => setFechaHasta(e.target.value)}
                      className="border border-slate-300 rounded-lg px-2 py-1.5 text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={filtroCodigo}
                  onChange={(e) => setFiltroCodigo(e.target.value)}
                  placeholder="Buscar N° Pedido..."
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-40"
                />
                <input
                  type="text"
                  value={filtroCliente}
                  onChange={(e) => setFiltroCliente(e.target.value)}
                  placeholder="Buscar Cliente..."
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-40"
                />
                <FiltroDesplegable
                  etiqueta="Proceso"
                  opciones={PROCESOS_ESPECIALES}
                  seleccionado={filtroProceso}
                  onSeleccionar={setFiltroProceso}
                />
                <FiltroDesplegable
                  etiqueta="Operario"
                  opciones={operariosUnicos}
                  seleccionado={filtroOperario}
                  onSeleccionar={setFiltroOperario}
                />
                <FiltroDesplegable
                  etiqueta="Máquina"
                  opciones={maquinasUnicas}
                  seleccionado={filtroMaquina}
                  onSeleccionar={setFiltroMaquina}
                />
                {hayFiltrosActivos && (
                  <button
                    onClick={limpiarFiltros}
                    className="text-sm text-slate-400 hover:text-slate-700 underline"
                  >
                    Limpiar filtros
                  </button>
                )}
                <button
                  onClick={descargarMovimientosPDF}
                  disabled={descargandoPDF || movimientos.length === 0}
                  className="ml-auto text-sm bg-slate-800 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-slate-900 disabled:opacity-50 whitespace-nowrap"
                >
                  {descargandoPDF ? 'Generando...' : `⬇ Descargar (${periodo === 'custom' ? 'Personalizado' : (PERIODOS_RAPIDOS.find((p) => p.id === periodo)?.label || 'Todo')})`}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
              <table className="min-w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">N° Pedido</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Proceso</th>
                    <th className="px-4 py-3">Máquina</th>
                    <th className="px-4 py-3">Operario</th>
                    <th className="px-4 py-3">Entrada</th>
                    <th className="px-4 py-3">Salida</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Hora</th>
                    <th className="px-4 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((mov) => (
                    <tr
                      key={mov.id}
                      onClick={() => setMovimientoAbierto(mov)}
                      className={`border-t border-slate-100 cursor-pointer hover:bg-blue-50/50 ${
                        (!mov.operario_id || !mov.maquina) ? 'bg-red-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {ordenes.find(o => o.id === mov.orden_id)?.codigo || mov.orden_id}
                      </td>
                      <td className="px-4 py-3">
                        {ordenes.find(o => o.id === mov.orden_id)?.cliente || '—'}
                      </td>
                      <td className="px-4 py-3">{mov.proceso}</td>
                      <td className="px-4 py-3">
                        {mov.maquina || <span className="text-red-600 font-medium">Falta máquina</span>}
                      </td>
                      <td className="px-4 py-3">
                        {mov.operario_id ? nombreOperario(mov.operario_id) : <span className="text-red-600 font-medium">Falta operario</span>}
                      </td>
                      <td className="px-4 py-3">{mov.entrada}</td>
                      <td className="px-4 py-3">{mov.salida}</td>
                      <td className="px-4 py-3">{formatearFecha(mov.fecha)}</td>
                      <td className="px-4 py-3">{mov.hora?.slice(0, 5)}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {puedeCrear() && (
                          <MenuAcciones
                            onEditar={esProduccionOMas() ? () => abrirEdicion(mov) : undefined}
                            onDuplicar={() => duplicarMovimiento(mov)}
                            onEliminar={esProduccionOMas() ? () => eliminarMovimiento(mov.id) : undefined}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {movimientos.length === 0 && (
              <p className="text-slate-400 text-center py-8">Ningún movimiento coincide con los filtros aplicados.</p>
            )}

            {hayMasMovimientos && movimientos.length > 0 && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={cargarMasMovimientos}
                  disabled={cargandoMas}
                  className="text-sm text-slate-600 border border-slate-300 rounded-lg px-4 py-2 hover:bg-slate-50 disabled:opacity-50"
                >
                  {cargandoMas ? 'Cargando...' : 'Cargar más movimientos'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {movimientoAbierto && (
        <DetalleMovimiento
          movimiento={movimientoAbierto}
          orden={ordenes.find(o => o.id === movimientoAbierto.orden_id)}
          onCerrar={() => { setMovimientoAbierto(null); cargarMovimientos() }}
        />
      )}

      {editando && (
        <ModalEditar
          titulo="Editar Movimiento"
          campos={[
            { name: 'orden_id', label: 'N° Pedido' },
            { name: 'proceso', label: 'Proceso', type: 'select', opciones: [...new Set([...PROCESOS_ESPECIALES, editando.proceso].filter(Boolean))] },
            { name: 'nombre_operario', label: 'Operario' },
            { name: 'maquina', label: 'Máquina', type: 'select', opciones: [...new Set([...(MAQUINAS_POR_PROCESO[editando.proceso] || []), editando.maquina].filter(Boolean))] },
            ...(editando.esEspecial ? [] : [
              { name: 'entrada', label: 'Entrada', type: 'number' },
              { name: 'salida', label: 'Salida', type: 'number' }
            ]),
            { name: 'hora_inicio', label: 'Hora de inicio', type: 'time' },
            { name: 'hora_fin', label: 'Hora de fin', type: 'time' },
            { name: 'observacion', label: 'Observación' }
          ]}
          valores={editando}
          onCambio={(campo, valor) => setEditando({ ...editando, [campo]: valor })}
          onGuardar={guardarEdicion}
          onCerrar={() => setEditando(null)}
          guardando={guardando}
        />
      )}
    </div>
  )
}

export default Movimientos