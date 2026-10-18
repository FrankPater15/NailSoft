// Error de una regla de negocio (datos inválidos, choque de horario, stock insuficiente...).
// Los controladores lo responden con su status y mensaje; cualquier otro error es un 500.
class ErrorNegocio extends Error {
  constructor(mensaje, status = 400) {
    super(mensaje);
    this.name = "ErrorNegocio";
    this.status = status;
  }
}

// Traduce errores conocidos (de negocio o de Mongoose) a { status, mensaje, detalles }
const clasificar = (error) => {
  if (error instanceof ErrorNegocio) return { status: error.status, mensaje: error.message };
  if (error?.name === "CastError") return { status: 400, mensaje: `El valor de "${error.path}" no es válido` };
  if (error?.name === "ValidationError") {
    const detalles = Object.values(error.errors).map((e) => e.message);
    return { status: 400, mensaje: detalles[0] || "Datos no válidos", detalles };
  }
  if (error?.code === 11000) {
    const campo = Object.keys(error.keyValue || error.keyPattern || {})[0];
    return {
      status: 409,
      mensaje: campo ? `Ya existe un registro con ese valor de "${campo}"` : "El registro ya existe",
    };
  }
  return null;
};

// Responde el error con su status, o un 500 genérico sin detalles internos.
// Incluye "msg" y "message" porque el frontend lee uno u otro según la pantalla.
const responderError = (res, error, mensaje500) => {
  const conocido = clasificar(error);
  if (conocido) {
    const { status, mensaje, detalles } = conocido;
    return res.status(status).json({ msg: mensaje, message: mensaje, ...(detalles && { errores: detalles }) });
  }
  console.error(`${mensaje500}:`, error);
  return res.status(500).json({ msg: mensaje500, message: mensaje500 });
};

module.exports = { ErrorNegocio, responderError };
