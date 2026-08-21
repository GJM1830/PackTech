import { useEffect, useState } from 'react'
import axios from './api'
import MenuAcciones from './MenuAcciones'
import ModalEditar from './ModalEditar'

function Operarios() {
  const [operarios, setOperarios] = useState([])
  const [form, setForm] = useState({ nombre: '', cargo: '' })
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [filtro, setFiltro] = useState('')  


  const abrirEdicion = (operario) => {
    setEditando({ id: operario.id, nombre: operario.nombre, cargo: operario.cargo })
  }

  const guardarEdicion = async () => {
    setGuardando(true)
    try {
      await axios.put(`https://packtech-production.up.railway.app/operarios/${editando.id}`, {
        nombre: editando.nombre,
        cargo: editando.cargo
      })
      setEditando(null)
      cargarOperarios()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al editar el operario.')
    } finally {
      setGuardando(false)
    }
  }

  const [hayMas, setHayMas] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)

  const cargarOperarios = () => {
    axios.get('https://packtech-production.up.railway.app/operarios?limit=20')
      .then((res) => {
        setOperarios(res.data)
        setHayMas(res.data.length === 20)
      })
      .catch((err) => console.error(err))
  }

  const cargarMasOperarios = () => {
    if (operarios.length === 0) return
    setCargandoMas(true)
    const ultimoId = operarios[operarios.length - 1].id
    axios.get(`https://packtech-production.up.railway.app/operarios?limit=20&antes_de=${ultimoId}`)
      .then((res) => {
        setOperarios((actual) => [...actual, ...res.data])
        setHayMas(res.data.length === 20)
      })
      .catch((err) => console.error(err))
      .finally(() => setCargandoMas(false))
  }

  useEffect(() => {
    cargarOperarios()
  }, [])

  const crearOperario = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError(null)

    try {
      await axios.post('https://packtech-production.up.railway.app/operarios', form)
      setForm({ nombre: '', cargo: '' })
      cargarOperarios()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear el operario.')
    } finally {
      setEnviando(false)
    }
  }

  const eliminarOperario = async (id) => {
    if (!confirm('¿Seguro que quieres eliminar este operario?')) return

    try {
      await axios.delete(`https://packtech-production.up.railway.app/operarios/${id}`)
      cargarOperarios()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al eliminar el operario.')
    }
  }

  const operariosFiltrados = operarios.filter((o) =>
  o.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
  (o.cargo || '').toLowerCase().includes(filtro.toLowerCase())
  )

  return (
  <div className="space-y-8">
    <div>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Operarios</h1>
      <p className="text-slate-500 text-sm mt-1">Administra el personal de planta registrado en el sistema.</p>
    </div>
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Registrar Operario</h2>

        <form onSubmit={crearOperario} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Nombre</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
              className="w-full border border-slate-300 rounded px-3 py-2"
              placeholder="Juan Perez"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Cargo</label>
            <input
              type="text"
              value={form.cargo}
              onChange={(e) => setForm({ ...form, cargo: e.target.value })}
              className="w-full border border-slate-300 rounded px-3 py-2"
              placeholder="Operario de máquina"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-green-700 text-white rounded-lg py-2.5 font-medium hover:bg-green-800 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {enviando ? 'Creando...' : 'Registrar Operario'}
          </button>
        </form>
      </div>

      <div>

        <input
          type="text"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar por nombre o cargo..."
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-64 mb-4"
        />

        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Cargo</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {operariosFiltrados.map((o) => (
                <tr key={o.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{o.id}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{o.nombre}</td>
                  <td className="px-4 py-3">{o.cargo}</td>
                  <td className="px-4 py-3 text-right">
                    <MenuAcciones
                      onEditar={() => abrirEdicion(o)}
                      onEliminar={() => eliminarOperario(o.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {hayMas && (
          <div className="flex justify-center mt-4">
            <button
              onClick={cargarMasOperarios}
              disabled={cargandoMas}
              className="text-sm text-slate-600 border border-slate-300 rounded-lg px-4 py-2 hover:bg-slate-50 disabled:opacity-50"
            >
              {cargandoMas ? 'Cargando...' : 'Cargar más operarios'}
            </button>
          </div>
        )}
      </div>
      {editando && (
      <ModalEditar
        titulo="Editar Operario"
        campos={[
          { name: 'nombre', label: 'Nombre' },
          { name: 'cargo', label: 'Cargo' }
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

export default Operarios