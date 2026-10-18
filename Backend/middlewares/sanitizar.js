// Quita de body, query y params las claves que empiezan con "$" o contienen ".",
// para que nadie pueda inyectar operadores de MongoDB (por ejemplo {"email": {"$ne": null}}).
const limpiar = (valor) => {
  if (Array.isArray(valor)) return valor.map(limpiar)
  if (valor && typeof valor === "object" && !(valor instanceof Date) && !Buffer.isBuffer(valor)) {
    for (const clave of Object.keys(valor)) {
      if (clave.startsWith("$") || clave.includes(".")) {
        delete valor[clave]
      } else {
        valor[clave] = limpiar(valor[clave])
      }
    }
  }
  return valor
}

const sanitizar = (req, res, next) => {
  limpiar(req.body)
  limpiar(req.query)
  limpiar(req.params)
  next()
}

module.exports = { sanitizar }
