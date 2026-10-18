const { response } = require("express")

/**
 * Middleware que exige al menos uno de los permisos indicados.
 * Debe ir después de validarJWT, que carga req.permisos.
 *
 * Cuando una ruta acepta un permiso "total" y uno "propio" (por ejemplo
 * ['verCitas', 'verCitasPropias']), el controlador decide el alcance con
 * tienePermiso(req, 'verCitas').
 *
 * @param {string[]} permisosRequeridos - Nombres de permiso; basta con tener uno
 * @returns {Function} Middleware
 */
const verificarPermisos = (permisosRequeridos) => {
  return (req, res = response, next) => {
    if (!req.permisos) {
      return res.status(401).json({
        msg: "Token no válido - usuario no existe en la petición",
      })
    }

    if (permisosRequeridos.some((permiso) => req.permisos.has(permiso))) {
      return next()
    }

    const desactivado = permisosRequeridos.find((permiso) => req.permisosInactivos?.has(permiso))
    if (desactivado) {
      return res.status(403).json({
        msg: `El permiso "${desactivado}" está desactivado`,
        permisoDesactivado: true, // Flag para el interceptor de axios
        nombrePermiso: desactivado,
      })
    }

    return res.status(403).json({
      msg: `No tienes el permiso "${permisosRequeridos.join('" o "')}" necesario para esta acción`,
      permisoNoAsignado: true,
    })
  }
}

const tienePermiso = (req, permiso) => Boolean(req.permisos?.has(permiso))

module.exports = verificarPermisos
module.exports.tienePermiso = tienePermiso
