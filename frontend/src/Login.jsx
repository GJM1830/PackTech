import { useState } from 'react'
import axios from 'axios'

function Login({ onIngresar }) {
  const [clave, setClave] = useState('')
  const [error, setError] = useState(null)
  const [verificando, setVerificando] = useState(false)

  const manejarEnvio = async (e) => {
    e.preventDefault()
    setVerificando(true)
    setError(null)

    try {
      const res = await axios.post('https://packtech-production.up.railway.app/login', { clave })

      localStorage.setItem('packtech_clave', clave)
      localStorage.setItem('packtech_rol', res.data.rol)
      localStorage.setItem('packtech_nombre', res.data.nombre || '')

      onIngresar()
    } catch (err) {
      setError('Clave incorrecta, intenta de nuevo.')
    } finally {
      setVerificando(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded-xl shadow-sm border border-slate-100 p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1 tracking-tight">PackTech</h1>
        <p className="text-slate-500 text-sm mb-6">Sistema de Gestión de Producción</p>

        <form onSubmit={manejarEnvio} className="space-y-4">
          <input
            type="password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            required
            autoFocus
            className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
            placeholder="Clave"
          />

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={verificando}
            className="w-full bg-blue-700 text-white rounded-lg py-2.5 font-medium hover:bg-blue-800 transition-all disabled:opacity-50"
          >
            {verificando ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login