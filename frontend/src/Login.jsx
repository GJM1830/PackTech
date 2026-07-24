import { useState } from 'react'

function Login({ onIngresar }) {
  const [clave, setClave] = useState('')
  const [error, setError] = useState(false)

  const manejarEnvio = (e) => {
    e.preventDefault()
    localStorage.setItem('packtech_clave', clave)
    onIngresar(clave)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded-xl shadow-sm border border-slate-100 p-8">
        <h1 className="text-xl font-bold text-slate-800 mb-1">📦 PackTech</h1>
        <p className="text-slate-500 text-sm mb-6">Ingresa la clave de acceso</p>

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
            <p className="text-red-600 text-sm">Clave incorrecta, intenta de nuevo.</p>
          )}

          <button
            type="submit"
            className="w-full bg-slate-900 text-white rounded-lg py-2.5 font-medium hover:bg-slate-800 transition-all"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login