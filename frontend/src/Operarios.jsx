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

  const cargarOperarios = () => {
    axios.get('https://packtech-production.up.railway.app/operarios')
      .then((res) => setOperarios(res.data))
      .catch((err) => console.error(err))
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
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Nuevo Operario</h2>

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
            className="w-full bg-slate-900 text-white rounded-lg py-2.5 font-medium hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {enviando ? 'Creando...' : 'Crear Operario'}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-4">Operarios</h2>

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