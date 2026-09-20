// Punto de entrada de la aplicación React. Monta <App /> dentro de un
// ErrorBoundary (para no dejar la pantalla en blanco si algo falla) y
// además evita que la rueda del mouse cambie el valor de un <input type="number">
// enfocado (comportamiento por defecto molesto del navegador en formularios).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'

document.addEventListener('wheel', () => {
  if (document.activeElement && document.activeElement.type === 'number') {
    document.activeElement.blur()
  }
}, { passive: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
