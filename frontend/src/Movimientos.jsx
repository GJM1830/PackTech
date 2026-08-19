import { useEffect, useState } from 'react'
import axios from './api'
import MenuAcciones from './MenuAcciones'
import ModalEditar from './ModalEditar'
import DetalleMovimiento from './DetalleMovimiento'
import FiltroDesplegable from './FiltroDesplegable'

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
    'Selladora-04', 'Selladora-05', 'Selladora-06', 'Selladora-07'
  ],
  'Corte': ['Cortadora-01', 'Cortadora-02'],
  'Almacén': ['Almacén'],
  'Despacho': ['Almacén']
}

const PROCESOS_ESPECIALES = ['Extrusión', 'Impresión', 'Corte', 'Sellado', 'Laminado']
const PROCESOS_DOBLE_LADO = ['Impresión', 'Corte', 'Sellado', 'Laminado']

function Movimientos() {
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
  const [filtroCodigo, setFiltroCodigo] = useState('')
  const [filtroProceso, setFiltroProceso] = useState(null)
  const [filtroOperario, setFiltroOperario] = useState(null)
  const [filtroMaquina, setFiltroMaquina] = useState(null)
  const [fechaDesde, setFechaDesde] = useState('')
  const [fechaHasta, setFechaHasta] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [sugerenciasTipoLaminado, setSugerenciasTipoLaminado] = useState([])
  const [sugerenciasTipoMerma, setSugerenciasTipoMerma] = useState([])

  const [form, setForm] = useState({
    orden_id: '',
    proceso: '',
    nombre_operario: '',
    maquina: '',
    entrada: '',
    salida: '',
    unidad: 'kg',
    tipo_laminado: '',
    observacion: ''
  })

  const [enviando, setEnviando] = useState(false)
  const [errorForm, setErrorForm] = useState(null)
  const [movimientoAbierto, setMovimientoAbierto] = useState(null)

  const esProcesoEspecial = PROCESOS_ESPECIALES.includes(form.proceso)

  const cargarDatos = async () => {
    setCargando(true)
    try {
      const [movRes, ordRes, opRes] = await Promise.all([
        axios.get('https://packtech-production.up.railway.app/movimientos'),
        axios.get('https://packtech-production.up.railway.app/ordenes-produccion'),
        axios.get('https://packtech-production.up.railway.app/operarios')
      ])

      setMovimientos(movRes.data)
      setOrdenes(ordRes.data)
      setOperarios(opRes.data)
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

  const nombreOperario = (id) => operarios.find(o => o.id === id)?.nombre || id

  const eliminarMovimiento = async (id) => {
    if (!confirm('¿Seguro que quieres eliminar este movimiento?')) return
    try {
      await axios.delete(`https://packtech-production.up.railway.app/movimientos/${id}`)
      cargarDatos()
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
      maquina: mov.maquina,
      entrada: mov.entrada,
      salida: mov.salida,
      unidad: mov.unidad,
      tipo_laminado: mov.tipo_laminado || '',
      observacion: mov.observacion || ''
    })

    setBusquedaOrden(codigoOrden)
    setOrdenSeleccionada({ id: mov.orden_id, codigo: codigoOrden })
    setBusquedaOperario(nombreOp)
    setOperarioSeleccionado({ nombre: nombreOp })

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
        observacion: editando.observacion || null
      })

      setEditando(null)
      cargarDatos()
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
      entrada: esProcesoEspecial
        ? (form.proceso === 'Extrusión' ? parseFloat(form.entrada) || 0 : 0)
        : parseFloat(form.entrada) || 0,
      salida: esProcesoEspecial ? 0 : (parseFloat(form.salida) || 0),
      unidad: form.unidad,
      tipo_laminado: form.proceso === 'Laminado' ? (form.tipo_laminado?.trim() || null) : null,
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
        observacion: ''
      })
      setBusquedaOrden('')
      setOrdenSeleccionada(null)
      setBusquedaOperario('')
      setOperarioSeleccionado(null)

      cargarDatos()

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

  const procesosUnicos = [...new Set(movimientos.map(m => m.proceso))].sort()
  const operariosUnicos = [...new Set(movimientos.map(m => nombreOperario(m.operario_id)))].sort()
  const maquinasUnicas = [...new Set(movimientos.map(m => m.maquina))].sort()

  const movimientosFiltrados = movimientos.filter((mov) => {
    const codigo = ordenes.find(o => o.id === mov.orden_id)?.codigo || String(mov.orden_id)
    const cliente = ordenes.find(o => o.id === mov.orden_id)?.cliente || ''
    if (filtroCodigo && !codigo.toLowerCase().includes(filtroCodigo.toLowerCase())) return false
    if (filtroCliente && !cliente.toLowerCase().includes(filtroCliente.toLowerCase())) return false
    if (filtroProceso && mov.proceso !== filtroProceso) return false
    if (filtroOperario && nombreOperario(mov.operario_id) !== filtroOperario) return false
    if (filtroMaquina && mov.maquina !== filtroMaquina) return false
    if (fechaDesde && mov.fecha < fechaDesde) return false
    if (fechaHasta && mov.fecha > fechaHasta) return false
    return true
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Movimientos</h1>
        <p className="text-slate-500 text-sm mt-1">Registra y consulta el avance de producción por proceso.</p>
      </div>

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

          {esProcesoEspecial ? (
            <>
              {form.proceso === 'Extrusión' && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Entrada (kg, sacos)
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
          ) : (
            <div className="flex flex-col sm:flex-row gap-4">
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
                  Faltante/Sobrante
                </label>
                <input
                  type="text"
                  readOnly
                  value={
                    form.entrada !== '' && form.salida !== ''
                      ? (parseFloat(form.entrada) - parseFloat(form.salida)).toFixed(2)
                      : ''
                  }
                  className="w-full border border-slate-300 rounded px-3 py-2 bg-slate-50 text-slate-600"
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
          )}

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

      <div>
        {cargando && <p className="text-slate-500">Cargando...</p>}
        {error && <p className="text-red-600">{error}</p>}

        {!cargando && !error && (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-4">
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
                opciones={procesosUnicos}
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
              {(filtroCodigo || filtroCliente || filtroProceso || filtroOperario || filtroMaquina || fechaDesde || fechaHasta) && (
                <button
                  onClick={() => {
                    setFiltroCodigo('')
                    setFiltroCliente('')
                    setFiltroProceso(null)
                    setFiltroOperario(null)
                    setFiltroMaquina(null)
                    setFechaDesde('')
                    setFechaHasta('')
                  }}
                  className="text-sm text-slate-400 hover:text-slate-700 underline"
                >
                  Limpiar filtros
                </button>
              )}
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
                    <th className="px-4 py-3">Unidad</th>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Hora</th>
                    <th className="px-4 py-3 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {movimientosFiltrados.map((mov) => (
                    <tr
                      key={mov.id}
                      onClick={() => setMovimientoAbierto(mov)}
                      className="border-t border-slate-100 cursor-pointer hover:bg-blue-50/50"
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {ordenes.find(o => o.id === mov.orden_id)?.codigo || mov.orden_id}
                      </td>
                      <td className="px-4 py-3">
                        {ordenes.find(o => o.id === mov.orden_id)?.cliente || '—'}
                      </td>
                      <td className="px-4 py-3">{mov.proceso}</td>
                      <td className="px-4 py-3">{mov.maquina}</td>
                      <td className="px-4 py-3">{nombreOperario(mov.operario_id)}</td>
                      <td className="px-4 py-3">{mov.entrada}</td>
                      <td className="px-4 py-3">{mov.salida}</td>
                      <td className="px-4 py-3">{mov.unidad}</td>
                      <td className="px-4 py-3">{formatearFecha(mov.fecha)}</td>
                      <td className="px-4 py-3">{mov.hora?.slice(0, 5)}</td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <MenuAcciones
                          onEditar={() => abrirEdicion(mov)}
                          onDuplicar={() => duplicarMovimiento(mov)}
                          onEliminar={() => eliminarMovimiento(mov.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {movimientoAbierto && (
        <DetalleMovimiento
          movimiento={movimientoAbierto}
          orden={ordenes.find(o => o.id === movimientoAbierto.orden_id)}
          onCerrar={() => { setMovimientoAbierto(null); cargarDatos() }}
        />
      )}

      {editando && (
        <ModalEditar
          titulo="Editar Movimiento"
          campos={[
            { name: 'orden_id', label: 'Código de Orden' },
            { name: 'proceso', label: 'Proceso' },
            { name: 'nombre_operario', label: 'Operario' },
            { name: 'maquina', label: 'Máquina' },
            { name: 'unidad', label: 'Unidad' },
            ...(editando.esEspecial ? [] : [
              { name: 'entrada', label: 'Entrada', type: 'number' },
              { name: 'salida', label: 'Salida', type: 'number' }
            ]),
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