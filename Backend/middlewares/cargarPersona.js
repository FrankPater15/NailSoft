const Cliente = require("../modules/cliente")
const Empleado = require("../modules/empleado")

// Deja en req.cliente y req.empleado el registro que corresponde al usuario autenticado
// (o null). Hoy se enlazan por correo; debe ir después de validarJWT.
const cargarPersona = async (req, res, next) => {
  try {
    const email = req.usuario?.email?.toLowerCase()
    if (!email) {
      req.cliente = null
      req.empleado = null
      return next()
    }
    const sinMayusculas = { locale: "es", strength: 2 }
    const [cliente, empleado] = await Promise.all([
      Cliente.findOne({ correocliente: email }).collation(sinMayusculas),
      Empleado.findOne({ correoempleado: email }).collation(sinMayusculas),
    ])
    req.cliente = cliente
    req.empleado = empleado
    next()
  } catch (error) {
    console.error("Error al cargar cliente/empleado del usuario:", error)
    res.status(500).json({ msg: "Error al verificar el usuario" })
  }
}

module.exports = { cargarPersona }
