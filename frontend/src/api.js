// Instancia de Axios compartida por todo el frontend: define el dominio del
// backend (baseURL) y agrega automáticamente la clave guardada en localStorage
// como header X-Clave en cada petición. El resto de la app importa este
// archivo y usa rutas relativas ("/clientes", "/pedidos", etc.).
import axios from 'axios'

const api = axios.create({
  baseURL: 'https://packtech-production.up.railway.app',
  timeout: 20000
})


api.interceptors.request.use((config) => {
  const clave = localStorage.getItem('packtech_clave')
  if (clave) {
    config.headers['X-Clave'] = clave
  }
  return config
})

export default api