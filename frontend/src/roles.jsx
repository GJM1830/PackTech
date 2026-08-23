export const obtenerRol = () => localStorage.getItem('packtech_rol')

export const esAdmin = () => obtenerRol() === 'admin'
export const esVendedorOMas = () => ['admin', 'vendedor'].includes(obtenerRol())
export const esProduccionOMas = () => ['admin', 'vendedor', 'produccion'].includes(obtenerRol())
export const puedeCrear = () => obtenerRol() !== 'observador'