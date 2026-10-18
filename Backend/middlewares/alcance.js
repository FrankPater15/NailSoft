const { isValidObjectId } = require("mongoose")
const { tienePermiso } = require("./verificarPermisos")

// Filtros de MongoDB con los registros que el usuario puede ver o modificar.
// Con el permiso "total" ve todo ({}); si no, solo lo suyo como cliente o como empleado.
// Devuelve null cuando no le corresponde ningún registro.
// Requiere validarJWT y cargarPersona.

const alcancePropio = (req, permisoTotal, campoCliente, campoEmpleado) => {
  if (tienePermiso(req, permisoTotal)) return {}
  const condiciones = []
  if (req.cliente) condiciones.push({ [campoCliente]: req.cliente._id })
  if (req.empleado) condiciones.push({ [campoEmpleado]: req.empleado._id })
  if (condiciones.length === 0) return null
  return condiciones.length === 1 ? condiciones[0] : { $or: condiciones }
}

const alcanceCitas = (req, permisoTotal) => alcancePropio(req, permisoTotal, "nombrecliente", "nombreempleado")

const alcanceVentas = (req, permisoTotal) => alcancePropio(req, permisoTotal, "cliente", "empleado")

// Middleware para rutas /:id: responde 404 si el registro no está en el alcance del usuario,
// así el controlador puede seguir buscando por id sin exponer registros ajenos
const exigirEnAlcance = (Modelo, alcance, permisoTotal, parametro = "id") => async (req, res, next) => {
  try {
    const filtro = alcance(req, permisoTotal)
    const id = req.params[parametro]
    if (!filtro || !isValidObjectId(id) || !(await Modelo.exists({ _id: id, ...filtro }))) {
      return res.status(404).json({ msg: "Registro no encontrado" })
    }
    next()
  } catch (error) {
    next(error)
  }
}

module.exports = { alcanceCitas, alcanceVentas, exigirEnAlcance }
