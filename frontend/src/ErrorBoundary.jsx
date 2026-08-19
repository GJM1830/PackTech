import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Error capturado:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-red-200 p-6 text-center">
            <h2 className="text-lg font-bold text-red-700 mb-2">Ocurrió un error inesperado</h2>
            <p className="text-sm text-slate-500 mb-4">
              Algo falló al mostrar esta pantalla. Intenta recargar la página; si el problema sigue, avisa al administrador.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-800"
            >
              Recargar página
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary