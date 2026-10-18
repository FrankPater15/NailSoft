const jwt = require("jsonwebtoken")
const User = require("../modules/usuario")

// Verifica el token y deja en la petición:
//   req.userId, req.usuario (con rol y permisos), req.userRole
//   req.permisos: nombres de los permisos activos del rol
//   req.permisosInactivos: nombres de los permisos del rol que están desactivados
const validarJWT = async (req, res, next) => {
  const header = req.header("Authorization") || ""
  const token = header.startsWith("Bearer ") ? header.slice(7) : header

  if (!token) {
    return res.status(401).json({
      msg: "No hay token en la petición",
    })
  }

  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET)
    // El token temporal de recuperación de contraseña no sirve como sesión
    if (payload.resetVerified) throw new Error("Token de recuperación")
  } catch {
    return res.status(401).json({
      msg: "Tu sesión no es válida o expiró. Inicia sesión de nuevo.",
    })
  }

  try {
    const usuario = await User.findById(payload.userId).populate({ path: "rol", populate: { path: "permisoRol" } })

    if (!usuario) {
      return res.status(401).json({
        msg: "Token no válido - usuario no existe en DB",
      })
    }

    // Un cambio de contraseña cierra las sesiones abiertas antes de él (iat va en segundos)
    if (usuario.passwordChangedAt && payload.iat * 1000 < usuario.passwordChangedAt.getTime() - 1000) {
      return res.status(401).json({
        msg: "Tu contraseña cambió. Inicia sesión de nuevo.",
      })
    }

    if (!usuario.estado) {
      return res.status(401).json({
        msg: "Cuenta inactiva - usuario con estado: false",
        cuentaInactiva: true,
      })
    }

    if (!usuario.rol || !usuario.rol.estadoRol) {
      return res.status(403).json({
        msg: "Rol desactivado",
        rolDesactivado: true,
      })
    }

    const permisosRol = usuario.rol.permisoRol || []
    req.userId = String(usuario._id)
    req.usuario = usuario
    req.userRole = usuario.rol.nombreRol
    req.permisos = new Set(permisosRol.filter((p) => p.activo).map((p) => p.nombrePermiso))
    req.permisosInactivos = new Set(permisosRol.filter((p) => !p.activo).map((p) => p.nombrePermiso))

    next()
  } catch (error) {
    console.error("Error en validarJWT:", error)
    return res.status(500).json({ msg: "Error al verificar la sesión" })
  }
}

module.exports = {
  validarJWT,
}
