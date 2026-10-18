const Cliente = require("../modules/cliente");
const Empleado = require("../modules/empleado");

// Busca el registro enlazado al usuario; si no hay enlace (datos anteriores a la migración),
// lo busca por correo.
const buscarEnlazado = async (Modelo, campoCorreo, usuario) =>
  (await Modelo.findOne({ usuario: usuario._id })) ||
  (await Modelo.findOne({ [campoCorreo]: usuario.email.toLowerCase(), usuario: { $exists: false } }));

// Deja en req.cliente y req.empleado el registro que corresponde al usuario autenticado
// (o null). Debe ir después de validarJWT.
const cargarPersona = async (req, res, next) => {
  try {
    if (!req.usuario) {
      req.cliente = null;
      req.empleado = null;
      return next();
    }
    const [cliente, empleado] = await Promise.all([
      buscarEnlazado(Cliente, "correocliente", req.usuario),
      buscarEnlazado(Empleado, "correoempleado", req.usuario),
    ]);
    req.cliente = cliente;
    req.empleado = empleado;
    next();
  } catch (error) {
    console.error("Error al cargar cliente/empleado del usuario:", error);
    res.status(500).json({ msg: "Error al verificar el usuario" });
  }
};

module.exports = { cargarPersona, buscarEnlazado };
