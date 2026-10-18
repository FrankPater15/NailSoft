// Error de una regla de negocio (datos inválidos, choque de horario, stock insuficiente...).
// Los controladores lo responden con su status y mensaje; cualquier otro error es un 500.
class ErrorNegocio extends Error {
  constructor(mensaje, status = 400) {
    super(mensaje)
    this.name = "ErrorNegocio"
    this.status = status
  }
}

// Responde un ErrorNegocio con su status, o un 500 genérico sin detalles internos.
// Incluye "msg" y "message" porque el frontend lee uno u otro según la pantalla.
const responderError = (res, error, mensaje500) => {
  if (error instanceof ErrorNegocio) {
    return res.status(error.status).json({ msg: error.message, message: error.message })
  }
  console.error(`${mensaje500}:`, error)
  return res.status(500).json({ msg: mensaje500, message: mensaje500 })
}

module.exports = { ErrorNegocio, responderError }
