import { useEffect, useState } from 'react'
import axios from './api'
import MenuAcciones from './MenuAcciones'
import ModalEditar from './ModalEditar'

function Clientes() {
  const [clientes, setClientes] = useState([])
  const [form, setForm] = useState({ ruc: '', nombre: '' })
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [filtro, setFiltro] = useState('')

  const abrirEdicion = (cliente) => {
    setEditando({ id: cliente.id, ruc: cliente.ruc, nombre: cliente.nombre })
  }

  const guardarEdicion = async () => {
    setGuardando(true)
    try {
      await axios.put(`https://packtech-production.up.railway.app/clientes/${editando.id}`, {
        ruc: editando.ruc,
        nombre: editando.nombre
      })
      setEditando(null)
      cargarClientes()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al editar el cliente.')
    } finally {
      setGuardando(false)
    }
  }

  const cargarClientes = () => {
    axios.get('https://packtech-production.up.railway.app/clientes')
      .then((res) => setClientes(res.data))
      .catch((err) => console.error(err))
  }

  useEffect(() => {
    cargarClientes()
  }, [])

  const crearCliente = async (e) => {
    e.preventDefault()
    setEnviando(true)
    setError(null)

    try {
      await axios.post('https://packtech-production.up.railway.app/clientes', form)
      setForm({ ruc: '', nombre: '' })
      cargarClientes()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al crear el cliente.')
    } finally {
      setEnviando(false)
    }
  }

  const eliminarCliente = async (id) => {
    if (!confirm('¿Seguro que quieres eliminar este cliente?')) return

    try {
      await axios.delete(`https://packtech-production.up.railway.app/clientes/${id}`)
      cargarClientes()
    } catch (err) {
      alert(err.response?.data?.detail || 'Error al eliminar el cliente.')
    }
  }

  const clientesFiltrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(filtro.toLowerCase()) ||
    c.ruc.includes(filtro)
  )

  return (
  <div className="space-y-8">
    <div>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clientes</h1>
      <p className="text-slate-500 text-sm mt-1">Administra los clientes registrados en el sistema.</p>
    </div>
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Nuevo Cliente</h2>

        <form onSubmit={crearCliente} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">RUC</label>
            <input
              type="text"
              value={form.ruc}
              onChange={(e) => setForm({ ...form, ruc: e.target.value })}
              required
              className="w-full border border-slate-300 rounded px-3 py-2"
              placeholder="20100070970"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Nombre</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
              className="w-full border border-slate-300 rounded px-3 py-2"
              placeholder="Alicorp"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="w-full bg-blue-700 text-white rounded-lg py-2.5 font-medium hover:bg-blue-800 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {enviando ? 'Creando...' : 'Crear Cliente'}
          </button>
        </form>
      </div>

      <div>

        <input
          type="text"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar por nombre o RUC..."
          className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-64 mb-4"
        />

        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-100">
          <table className="min-w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">RUC</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{c.id}</td>
                  <td className="px-4 py-3">{c.ruc}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{c.nombre}</td>
                  <td className="px-4 py-3 text-right">
                    <MenuAcciones
                      onEditar={() => abrirEdicion(c)}
                      onEliminar={() => eliminarCliente(c.id)}
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
          titulo="Editar Cliente"
          campos={[
            { name: 'ruc', label: 'RUC' },
            { name: 'nombre', label: 'Nombre' }
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

export default Clientes