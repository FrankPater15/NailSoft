// Fichas de cliente y empleado enlazadas a un usuario.
// Una ficha con historial (citas o ventas) nunca se borra: se desactiva y se desenlaza,
// para que los reportes y el historial sigan apuntando a un registro existente.
const Cliente = require("../modules/cliente")
const Empleado = require("../modules/empleado")
const Cita = require("../modules/cita")
const Venta = require("../modules/venta")

const tieneHistorialCliente = async (id) =>
  Boolean((await Cita.exists({ nombrecliente: id })) || (await Venta.exists({ cliente: id })))

const tieneHistorialEmpleado = async (id) =>
  Boolean((await Cita.exists({ nombreempleado: id })) || (await Venta.exists({ empleado: id })))

const fichaDe = (Modelo, campoCorreo, usuario) =>
  Modelo.findOne({ $or: [{ usuario: usuario._id }, { [campoCorreo]: usuario.email.toLowerCase() }] })

// Crea o reactiva la ficha de cliente del usuario y la deja enlazada
const asegurarCliente = async (usuario) => {
  const existente = await fichaDe(Cliente, "correocliente", usuario)
  if (existente) {
    Object.assign(existente, { usuario: usuario._id, estadocliente: true })
    return existente.save()
  }
  return Cliente.create({
    nombrecliente: usuario.nombre,
    apellidocliente: usuario.apellido || "",
    correocliente: usuario.email,
    celularcliente: usuario.celular,
    estadocliente: true,
    usuario: usuario._id,
  })
}

// Crea o reactiva la ficha de empleado del usuario y la deja enlazada
const asegurarEmpleado = async (usuario) => {
  const existente = await fichaDe(Empleado, "correoempleado", usuario)
  if (existente) {
    Object.assign(existente, { usuario: usuario._id, estadoempleado: true })
    return existente.save()
  }
  return Empleado.create({
    nombreempleado: usuario.nombre,
    apellidoempleado: usuario.apellido || "",
    correoempleado: usuario.email,
    telefonoempleado: usuario.celular || "",
    estadoempleado: true,
    usuario: usuario._id,
  })
}

// Quita la ficha de cliente del usuario: la borra si no tiene historial, si no la desactiva
const retirarCliente = async (usuario) => {
  const ficha = await fichaDe(Cliente, "correocliente", usuario)
  if (!ficha) return
  if (await tieneHistorialCliente(ficha._id)) {
    ficha.estadocliente = false
    ficha.usuario = undefined
    await ficha.save()
  } else {
    await ficha.deleteOne()
  }
}

// Quita la ficha de empleado del usuario: la borra si no tiene historial, si no la desactiva
const retirarEmpleado = async (usuario) => {
  const ficha = await fichaDe(Empleado, "correoempleado", usuario)
  if (!ficha) return
  if (await tieneHistorialEmpleado(ficha._id)) {
    ficha.estadoempleado = false
    ficha.usuario = undefined
    await ficha.save()
  } else {
    await ficha.deleteOne()
  }
}

// Mantiene el correo de las fichas enlazadas igual al del usuario
const sincronizarCorreo = async (usuarioId, email) => {
  const correo = email.toLowerCase().trim()
  await Cliente.updateOne({ usuario: usuarioId }, { correocliente: correo })
  await Empleado.updateOne({ usuario: usuarioId }, { correoempleado: correo })
}

module.exports = {
  tieneHistorialCliente,
  tieneHistorialEmpleado,
  asegurarCliente,
  asegurarEmpleado,
  retirarCliente,
  retirarEmpleado,
  sincronizarCorreo,
}
