// Cálculo de ventas en un solo lugar: precios desde la base de datos, descuentos con límites
// y stock reservado de forma atómica (con reversión si algo falla).
const { isValidObjectId } = require("mongoose")
const Producto = require("../modules/producto")
const Servicio = require("../modules/servicio")
const { ErrorNegocio } = require("../utils/errores")

const CANTIDAD_MAXIMA = 999

const redondear = (valor) => Math.round(valor * 100) / 100

const idDe = (item, campo) => {
  const valor = item && typeof item === "object" ? item[campo]?._id || item[campo] || item._id : item
  return String(valor)
}

// Monto de un descuento sobre `base`, nunca negativo ni mayor que la base
const montoDescuento = ({ valor, esPorcentaje }, base) =>
  redondear(Math.min(Math.max(esPorcentaje ? (base * valor) / 100 : valor, 0), base))

/**
 * Valida los descuentos manuales enviados por el usuario.
 * Formato: { tipo: "servicio" | "global", servicioId?, nombre?, valor, esPorcentaje? }
 */
const normalizarDescuentos = (descuentos = []) => {
  if (!Array.isArray(descuentos)) throw new ErrorNegocio("Los descuentos deben ser una lista")
  return descuentos.map((d) => {
    if (!d || !["servicio", "global"].includes(d.tipo)) {
      throw new ErrorNegocio('Cada descuento debe ser de tipo "servicio" o "global"')
    }
    const valor = Number(d.valor)
    const esPorcentaje = d.esPorcentaje !== false
    if (!Number.isFinite(valor) || valor < 0) throw new ErrorNegocio("El valor de un descuento no puede ser negativo")
    if (esPorcentaje && valor > 100) throw new ErrorNegocio("Un descuento porcentual no puede superar el 100 %")
    if (d.tipo === "servicio" && !isValidObjectId(d.servicioId)) {
      throw new ErrorNegocio("Un descuento por servicio debe indicar un servicioId válido")
    }
    return {
      tipo: d.tipo,
      servicioId: d.tipo === "servicio" ? String(d.servicioId) : undefined,
      nombre: String(d.nombre || (d.tipo === "global" ? "Descuento global" : "Descuento")).slice(0, 100),
      valor,
      esPorcentaje,
    }
  })
}

/**
 * Líneas de productos con precio de la base de datos. Agrupa productos repetidos.
 * Con verificarStock comprueba que alcance el stock actual (sin descontarlo).
 */
const lineasProductos = async (items = [], { verificarStock = true } = {}) => {
  if (!Array.isArray(items)) throw new ErrorNegocio("Los productos deben ser una lista")
  const cantidades = new Map()
  for (const item of items) {
    const id = idDe(item, "producto")
    const cantidad = Number(item?.cantidad ?? 1)
    if (!isValidObjectId(id)) throw new ErrorNegocio("Uno o más productos no son válidos")
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > CANTIDAD_MAXIMA) {
      throw new ErrorNegocio(`La cantidad de cada producto debe ser un entero entre 1 y ${CANTIDAD_MAXIMA}`)
    }
    cantidades.set(id, (cantidades.get(id) || 0) + cantidad)
  }
  if (cantidades.size === 0) return []

  const productos = await Producto.find({ _id: { $in: [...cantidades.keys()] } })
  if (productos.length !== cantidades.size) throw new ErrorNegocio("Uno o más productos no existen")

  return productos.map((producto) => {
    const cantidad = cantidades.get(String(producto._id))
    if (producto.estado === false) throw new ErrorNegocio(`El producto "${producto.nombreProducto}" no está disponible`)
    if (verificarStock && producto.stock < cantidad) {
      throw new ErrorNegocio(`Stock insuficiente para el producto ${producto.nombreProducto}. Disponible: ${producto.stock}`)
    }
    return {
      producto: producto._id,
      nombreProducto: producto.nombreProducto,
      precio: producto.precio,
      cantidad,
      subtotal: redondear(producto.precio * cantidad),
    }
  })
}

/**
 * Líneas de servicios con precio de la base de datos y su descuento: el manual (si se envía
 * para ese servicio) o el del tipo de descuento del servicio (si está activo).
 */
const lineasServicios = async (items = [], descuentosManuales = []) => {
  if (!Array.isArray(items)) throw new ErrorNegocio("Los servicios deben ser una lista")
  const ids = items.map((item) => idDe(item, "servicio"))
  if (!ids.every(isValidObjectId)) throw new ErrorNegocio("Uno o más servicios no son válidos")
  if (ids.length === 0) return []

  const servicios = await Servicio.find({ _id: { $in: [...new Set(ids)] } }).populate("tipoServicio", "descuento esPromocional activo")
  const porId = new Map(servicios.map((s) => [String(s._id), s]))

  return ids.map((id) => {
    const servicio = porId.get(id)
    if (!servicio) throw new ErrorNegocio("Uno o más servicios no existen")

    const manual = descuentosManuales.find((d) => d.tipo === "servicio" && d.servicioId === id)
    const tipo = servicio.tipoServicio
    let descuentoAplicado = 0
    let tipoDescuento = null
    if (manual) {
      descuentoAplicado = montoDescuento(manual, servicio.precio)
      tipoDescuento = "manual"
    } else if (tipo && tipo.activo !== false && tipo.descuento > 0) {
      descuentoAplicado = montoDescuento({ valor: tipo.descuento, esPorcentaje: true }, servicio.precio)
      tipoDescuento = tipo.esPromocional ? "promocional" : "tipo-servicio"
    }

    return {
      servicio: servicio._id,
      nombreServicio: servicio.nombreServicio,
      precio: servicio.precio,
      precioFinal: redondear(servicio.precio - descuentoAplicado),
      tiempo: servicio.tiempo,
      descuentoAplicado,
      tipoDescuento,
    }
  })
}

/**
 * Lista de descuentos que se guarda en la venta: los manuales por servicio (con el monto que
 * se aplicó) y los globales, calculados sobre lo que queda después de los descuentos por servicio.
 */
const resumenDescuentos = (descuentosManuales, productos, servicios) => {
  const porServicio = descuentosManuales
    .filter((d) => d.tipo === "servicio")
    .map((d) => ({
      ...d,
      montoDescontado: servicios
        .filter((s) => String(s.servicio) === d.servicioId && s.tipoDescuento === "manual")
        .reduce((total, s) => total + s.descuentoAplicado, 0),
    }))

  let restante =
    productos.reduce((total, p) => total + p.subtotal, 0) + servicios.reduce((total, s) => total + s.precioFinal, 0)
  const globales = descuentosManuales
    .filter((d) => d.tipo === "global")
    .map((d) => {
      const montoDescontado = montoDescuento(d, restante)
      restante -= montoDescontado
      return { ...d, montoDescontado }
    })

  return [...porServicio, ...globales]
}

/**
 * Descuenta el stock de cada línea solo si alcanza (operación atómica por producto).
 * Si una falla, devuelve lo ya descontado y lanza el error.
 */
const reservarStock = async (lineas) => {
  const reservadas = []
  for (const linea of lineas) {
    const { modifiedCount } = await Producto.updateOne(
      { _id: linea.producto, stock: { $gte: linea.cantidad } },
      { $inc: { stock: -linea.cantidad } }
    )
    if (modifiedCount === 0) {
      await devolverStock(reservadas)
      const producto = await Producto.findById(linea.producto).select("nombreProducto stock")
      throw new ErrorNegocio(
        `Stock insuficiente para el producto ${producto?.nombreProducto || linea.nombreProducto}. Disponible: ${producto?.stock ?? 0}`
      )
    }
    reservadas.push(linea)
  }
}

const devolverStock = async (lineas) => {
  for (const linea of lineas) {
    await Producto.updateOne({ _id: linea.producto?._id || linea.producto }, { $inc: { stock: linea.cantidad } })
  }
}

module.exports = {
  normalizarDescuentos,
  lineasProductos,
  lineasServicios,
  resumenDescuentos,
  reservarStock,
  devolverStock,
}
