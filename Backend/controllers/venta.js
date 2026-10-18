const { response } = require("express");
const Venta = require("../modules/venta");
const Contador = require("../modules/contador");
const Cita = require("../modules/cita");
const Cliente = require("../modules/cliente");
const Empleado = require("../modules/empleado");
const { isValidObjectId } = require("mongoose");
const { tienePermiso } = require("../middlewares/verificarPermisos");
const { alcanceVentas } = require("../middlewares/alcance");
const { ErrorNegocio, responderError } = require("../utils/errores");
const {
  normalizarDescuentos,
  lineasProductos,
  lineasServicios,
  resumenDescuentos,
  reservarStock,
  devolverStock,
} = require("../services/calculoVenta");

// Función para obtener el siguiente código de venta
const obtenerSiguienteCodigoVenta = async () => {
  const contador = await Contador.findOneAndUpdate(
    { nombre: "venta" },
    { $inc: { secuencia: 1 } },
    { new: true, upsert: true },
  );
  return `V${contador.secuencia.toString().padStart(4, "0")}`;
};

// Obtener las ventas: todas con verVentas, si no solo las propias
const obtenerVentas = async (req, res = response) => {
  try {
    const filtro = alcanceVentas(req, "verVentas");
    if (!filtro) return res.json({ ventas: [] });
    const ventas = await Venta.find(filtro)
      .populate("cliente", "nombrecliente apellidocliente correocliente celularcliente")
      .populate("empleado", "nombreempleado")
      .populate({
        path: "cita",
        select: "fechacita",
      })
      .populate("productos.producto", "nombreProducto precio stock categoria")
      .populate("servicios.servicio", "nombreServicio precio tiempo")
      .populate("descuentos.servicioId", "nombreServicio")
      .sort({ fechaCreacion: -1 })
      .lean();

    res.json({ ventas });
  } catch (error) {
    responderError(res, error, "Error al obtener las ventas");
  }
};

// Obtener una venta por ID
const obtenerVentaPorId = async (req, res = response) => {
  const { id } = req.params;

  try {
    const venta = await Venta.findById(id)
      .populate("cliente", "nombrecliente apellidocliente correocliente celularcliente")
      .populate("empleado", "nombreempleado")
      .populate({
        path: "cita",
        select: "fechacita estadocita",
      })
      .populate("productos.producto", "nombreProducto categoria stock")
      .populate("servicios.servicio", "nombreServicio categoria")
      .populate("descuentos.servicioId", "nombreServicio");

    if (!venta) {
      return res.status(404).json({
        msg: "Venta no encontrada",
      });
    }

    res.json({ venta });
  } catch (error) {
    responderError(res, error, "Error al obtener la venta");
  }
};

// Venta con todas las referencias pobladas, como la devuelven las rutas que la modifican
const ventaPoblada = (id) =>
  Venta.findById(id)
    .populate("cliente", "nombrecliente apellidocliente correocliente celularcliente")
    .populate("empleado", "nombreempleado")
    .populate({ path: "cita", select: "fechacita estadocita" })
    .populate("productos.producto", "nombreProducto categoria stock")
    .populate("servicios.servicio", "nombreServicio categoria")
    .populate("descuentos.servicioId", "nombreServicio");

// Los descuentos manuales requieren el permiso aplicarDescuentos
const descuentosPermitidos = (req, descuentos) => {
  const normalizados = normalizarDescuentos(descuentos);
  if (normalizados.length > 0 && !tienePermiso(req, "aplicarDescuentos")) {
    throw new ErrorNegocio('No tienes el permiso "aplicarDescuentos" para dar descuentos manuales', 403);
  }
  return normalizados;
};

const validarClienteEmpleado = async (cliente, empleado) => {
  const [existeCliente, existeEmpleado] = await Promise.all([
    isValidObjectId(cliente) && Cliente.exists({ _id: cliente }),
    isValidObjectId(empleado) && Empleado.exists({ _id: empleado }),
  ]);
  if (!existeCliente || !existeEmpleado) {
    throw new ErrorNegocio("El cliente o el empleado especificado no existe en la base de datos");
  }
};

const validarCita = async (cita) => {
  if (cita && !(isValidObjectId(cita) && (await Cita.exists({ _id: cita })))) {
    throw new ErrorNegocio("La cita especificada no existe en la base de datos");
  }
};

const marcarCitaCompletada = (cita) =>
  Cita.findByIdAndUpdate(cita, { estadocita: "Completada" }, { runValidators: false });

const exigirNoFinalizada = (venta) => {
  if (venta.estado) throw new ErrorNegocio("La venta ya está finalizada y no se puede modificar");
};

// Crear una nueva venta. Precios desde la base de datos; el stock se reserva al final.
const crearVenta = async (req, res = response) => {
  try {
    const { cliente, empleado, cita, productos = [], servicios = [], metodoPago, estado, observaciones } = req.body;

    if (productos.length === 0 && servicios.length === 0) {
      throw new ErrorNegocio("La venta debe incluir al menos un producto o un servicio");
    }
    const descuentos = descuentosPermitidos(req, req.body.descuentos);
    await validarClienteEmpleado(cliente, empleado);
    await validarCita(cita);

    const lineasP = await lineasProductos(productos);
    const lineasS = await lineasServicios(servicios, descuentos);

    await reservarStock(lineasP);
    let venta;
    try {
      venta = new Venta({
        codigoVenta: await obtenerSiguienteCodigoVenta(),
        cliente,
        empleado,
        cita,
        productos: lineasP,
        servicios: lineasS,
        descuentos: resumenDescuentos(descuentos, lineasP, lineasS),
        total: 0, // lo calcula el pre("save") del modelo
        metodoPago: metodoPago || "Efectivo",
        estado: Boolean(estado),
        observaciones,
      });
      if (venta.estado) venta.fechaFinalizacion = new Date();
      await venta.save();
    } catch (error) {
      await devolverStock(lineasP);
      throw error;
    }

    if (venta.estado && cita) await marcarCitaCompletada(cita);

    res.status(201).json({
      msg: "Venta creada correctamente",
      venta: await ventaPoblada(venta._id),
    });
  } catch (error) {
    responderError(res, error, "Error al crear la venta");
  }
};

// Actualizar una venta pendiente: recalcula todo y ajusta el stock
const actualizarVenta = async (req, res = response) => {
  const { id } = req.params;
  try {
    const { cliente, empleado, cita, productos = [], servicios = [], metodoPago, estado, observaciones } = req.body;

    const venta = await Venta.findById(id);
    if (!venta) return res.status(404).json({ msg: "Venta no encontrada" });
    exigirNoFinalizada(venta);

    if (productos.length === 0 && servicios.length === 0) {
      throw new ErrorNegocio("La venta debe incluir al menos un producto o un servicio");
    }
    const descuentos = descuentosPermitidos(req, req.body.descuentos);
    await validarClienteEmpleado(cliente || venta.cliente, empleado || venta.empleado);
    await validarCita(cita);

    // El stock se verifica al reservarlo, después de devolver el de la venta original
    const lineasP = await lineasProductos(productos, { verificarStock: false });
    const lineasS = await lineasServicios(servicios, descuentos);

    const anteriores = venta.productos.map((p) => ({ producto: p.producto, cantidad: p.cantidad }));
    await devolverStock(anteriores);
    try {
      await reservarStock(lineasP);
    } catch (error) {
      await reservarStock(anteriores).catch(() => {});
      throw error;
    }

    Object.assign(venta, {
      cliente: cliente || venta.cliente,
      empleado: empleado || venta.empleado,
      cita: cita || venta.cita,
      productos: lineasP,
      servicios: lineasS,
      descuentos: resumenDescuentos(descuentos, lineasP, lineasS),
      metodoPago: metodoPago || venta.metodoPago,
      observaciones: observaciones !== undefined ? observaciones : venta.observaciones,
    });
    if (estado) {
      venta.estado = true;
      venta.fechaFinalizacion = new Date();
    }
    await venta.save();

    if (venta.estado && venta.cita) await marcarCitaCompletada(venta.cita);

    res.json({
      msg: "Venta actualizada correctamente",
      venta: await ventaPoblada(id),
    });
  } catch (error) {
    responderError(res, error, "Error al actualizar la venta");
  }
};

// Eliminar una venta y devolver el stock de sus productos
const eliminarVenta = async (req, res = response) => {
  const { id } = req.params;
  try {
    const venta = await Venta.findByIdAndDelete(id);
    if (!venta) return res.status(404).json({ msg: "Venta no encontrada" });

    await devolverStock(venta.productos);

    res.json({ msg: "Venta eliminada correctamente" });
  } catch (error) {
    responderError(res, error, "Error al eliminar la venta");
  }
};

// Finalizar una venta, opcionalmente con nuevos descuentos manuales.
// Si ya estaba finalizada y no llegan descuentos, solo la devuelve (idempotente).
const finalizarVenta = async (req, res = response) => {
  const { id } = req.params;
  try {
    const { metodoPago } = req.body;
    const descuentos = descuentosPermitidos(req, req.body.descuentos);

    const venta = await Venta.findById(id);
    if (!venta) return res.status(404).json({ msg: "Venta no encontrada" });

    if (venta.estado && descuentos.length === 0) {
      return res.json({ msg: "La venta ya estaba finalizada", venta: await ventaPoblada(id) });
    }
    exigirNoFinalizada(venta);

    if (descuentos.length > 0) {
      venta.servicios = await lineasServicios(venta.servicios, descuentos);
      venta.descuentos = resumenDescuentos(descuentos, venta.productos, venta.servicios);
    }

    venta.metodoPago = metodoPago || venta.metodoPago;
    venta.fechaFinalizacion = new Date();
    venta.estado = true;
    await venta.save();

    if (venta.cita) await marcarCitaCompletada(venta.cita);

    res.json({
      msg: "Venta finalizada correctamente",
      venta: await ventaPoblada(id),
    });
  } catch (error) {
    responderError(res, error, "Error al finalizar la venta");
  }
};

// Agregar productos a una venta pendiente
const agregarProductosVenta = async (req, res = response) => {
  const { id } = req.params;
  try {
    const { productos } = req.body;
    if (!Array.isArray(productos) || productos.length === 0) {
      throw new ErrorNegocio("Debe proporcionar al menos un producto para añadir");
    }

    const venta = await Venta.findById(id);
    if (!venta) return res.status(404).json({ msg: "Venta no encontrada" });
    exigirNoFinalizada(venta);

    const nuevas = await lineasProductos(productos);
    await reservarStock(nuevas);
    try {
      // Si el producto ya estaba en la venta, suma la cantidad a su línea
      for (const linea of nuevas) {
        const existente = venta.productos.find((p) => String(p.producto) === String(linea.producto));
        if (existente) {
          existente.cantidad += linea.cantidad;
          existente.subtotal = existente.precio * existente.cantidad;
        } else {
          venta.productos.push(linea);
        }
      }
      await venta.save();
    } catch (error) {
      await devolverStock(nuevas);
      throw error;
    }

    res.json({
      msg: "Productos añadidos correctamente",
      venta: await ventaPoblada(id),
    });
  } catch (error) {
    responderError(res, error, "Error al añadir productos a la venta");
  }
};

// Agregar servicios a una venta pendiente
const agregarServiciosVenta = async (req, res = response) => {
  const { id } = req.params;
  try {
    const { servicios } = req.body;
    if (!Array.isArray(servicios) || servicios.length === 0) {
      throw new ErrorNegocio("Debe proporcionar al menos un servicio para añadir");
    }
    const descuentos = descuentosPermitidos(req, req.body.descuentos);

    const venta = await Venta.findById(id);
    if (!venta) return res.status(404).json({ msg: "Venta no encontrada" });
    exigirNoFinalizada(venta);

    venta.servicios.push(...(await lineasServicios(servicios, descuentos)));
    if (descuentos.length > 0) {
      const anteriores = venta.descuentos.map((d) => d.toObject());
      const nuevos = resumenDescuentos(descuentos, venta.productos, venta.servicios);
      venta.descuentos = [...anteriores, ...nuevos];
    }
    await venta.save();

    res.json({
      msg: "Servicios añadidos correctamente",
      venta: await ventaPoblada(id),
    });
  } catch (error) {
    responderError(res, error, "Error al añadir servicios a la venta");
  }
};

// Obtener ventas por cliente
const obtenerVentasPorCliente = async (req, res) => {
  try {
    // Con verVentas se puede consultar cualquier cliente; si no, solo el propio
    let clienteId = req.cliente?._id;
    if (tienePermiso(req, "verVentas") && req.query.clienteId) {
      clienteId = req.query.clienteId;
    }
    if (!clienteId || !isValidObjectId(clienteId)) {
      return res.status(200).json([]);
    }

    const ventas = await Venta.find({ cliente: clienteId })
      .populate("cliente")
      .populate("empleado")
      .populate("cita")
      .populate("productos.producto")
      .populate("servicios.servicio")
      .populate("descuentos.servicioId")
      .sort({ fechaCreacion: -1 });

    res.status(200).json(ventas);
  } catch (error) {
    responderError(res, error, "Error al obtener las ventas");
  }
};

// En venta.js (controlador)
const obtenerVentasPorCita = async (req, res = response) => {
  const { citaId } = req.params;
  try {
    const filtro = alcanceVentas(req, "verVentas");
    if (!filtro || !isValidObjectId(citaId)) return res.json([]);
    const ventas = await Venta.find({ cita: citaId, ...filtro })
      .populate("cliente")
      .populate("empleado")
      .populate("cita")
      .populate("productos.producto")
      .populate("servicios.servicio");

    res.json(ventas);
  } catch (error) {
    responderError(res, error, "Error al obtener ventas por cita");
  }
};

module.exports = {
  obtenerVentas,
  obtenerVentaPorId,
  crearVenta,
  actualizarVenta,
  eliminarVenta,
  finalizarVenta,
  agregarProductosVenta,
  agregarServiciosVenta,
  obtenerVentasPorCliente,
  obtenerVentasPorCita,
  obtenerSiguienteCodigoVenta,
};
