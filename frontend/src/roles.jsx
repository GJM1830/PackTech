// Helpers de permisos por rol, leyendo el rol guardado en localStorage al
// iniciar sesión. Se usan en toda la app para mostrar/ocultar botones y
// acciones según el rol (observador < produccion < vendedor < admin).
export const obtenerRol = () => localStorage.getItem('packtech_rol')

export const esAdmin = () => obtenerRol() === 'admin'
export const esVendedorOMas = () => ['admin', 'vendedor'].includes(obtenerRol())
export const esProduccionOMas = () => ['admin', 'vendedor', 'produccion'].includes(obtenerRol())
export const puedeCrear = () => obtenerRol() !== 'observador'