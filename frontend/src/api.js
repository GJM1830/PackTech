import axios from './api'

const api = axios.create({
  baseURL: 'https://packtech-production.up.railway.app'
})

api.interceptors.request.use((config) => {
  const clave = localStorage.getItem('packtech_clave')
  if (clave) {
    config.headers['X-Clave'] = clave
  }
  return config
})

export default api