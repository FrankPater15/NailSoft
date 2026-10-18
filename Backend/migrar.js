// Migra datos existentes al modelo actual. Se puede ejecutar varias veces sin efectos repetidos.
// Uso: npm run migrar
require("dotenv").config();
process.env.TZ = process.env.TZ || "America/Bogota";

const mongoose = require("mongoose");
const Usuario = require("./modules/usuario");
const Cliente = require("./modules/cliente");
const Empleado = require("./modules/empleado");
const Producto = require("./modules/producto");
const Cita = require("./modules/cita");
const Venta = require("./modules/venta");
const Permiso = require("./modules/permiso");
const Rol = require("./modules/rol");
const { inicioDeCita } = require("./services/agenda");

const avisos = [];

// stock guardado como texto ("25") → número
const stockNumerico = async () => {
  const productos = await Producto.collection.find({ stock: { $type: "string" } }).toArray();
  for (const producto of productos) {
    const stock = Number.parseInt(producto.stock, 10);
    if (!Number.isInteger(stock) || stock < 0)
      avisos.push(`Producto "${producto.nombreProducto}": stock "${producto.stock}" no es válido, se dejó en 0`);
    await Producto.collection.updateOne(
      { _id: producto._id },
      { $set: { stock: Number.isInteger(stock) && stock >= 0 ? stock : 0 } },
    );
  }
  return productos.length;
};

// Correos en minúsculas y sin espacios (si no choca con otro registro)
const correosEnMinusculas = async (Modelo, campo) => {
  let cambiados = 0;
  const docs = await Modelo.collection
    .find({ [campo]: { $type: "string" } })
    .project({ [campo]: 1 })
    .toArray();
  for (const doc of docs) {
    const normalizado = doc[campo].toLowerCase().trim();
    if (normalizado === doc[campo]) continue;
    if (await Modelo.collection.findOne({ [campo]: normalizado, _id: { $ne: doc._id } })) {
      avisos.push(`${Modelo.modelName}: "${doc[campo]}" no se normalizó porque ya existe "${normalizado}"`);
      continue;
    }
    await Modelo.collection.updateOne({ _id: doc._id }, { $set: { [campo]: normalizado } });
    cambiados++;
  }
  return cambiados;
};

// Enlaza cada ficha de cliente o empleado con el usuario del mismo correo
const enlazarFichas = async (Modelo, campoCorreo) => {
  let enlazadas = 0;
  const fichas = await Modelo.find({ usuario: { $exists: false } });
  for (const ficha of fichas) {
    const usuario = await Usuario.findOne({ email: ficha[campoCorreo] });
    if (!usuario || (await Modelo.exists({ usuario: usuario._id }))) continue;
    ficha.usuario = usuario._id;
    await ficha.save({ validateBeforeSave: false });
    enlazadas++;
  }
  return enlazadas;
};

// fechacita con la hora real de inicio (antes algunas citas guardaban la medianoche)
// y servicios con el campo "servicio" (algunas pantallas solo enviaban _id)
const normalizarCitas = async () => {
  let cambiadas = 0;
  const citas = await Cita.collection.find({}).toArray();
  for (const cita of citas) {
    const cambios = {};
    try {
      const inicio = inicioDeCita(cita.fechacita, cita.horacita);
      if (inicio.getTime() !== new Date(cita.fechacita).getTime()) cambios.fechacita = inicio;
    } catch {
      avisos.push(`Cita ${cita._id}: hora "${cita.horacita}" no válida, no se ajustó la fecha`);
    }
    if (Array.isArray(cita.servicios) && cita.servicios.some((s) => !s.servicio && s._id)) {
      cambios.servicios = cita.servicios.map((s) => (s.servicio ? s : { ...s, servicio: s._id }));
    }
    if (Object.keys(cambios).length) {
      await Cita.collection.updateOne({ _id: cita._id }, { $set: cambios });
      cambiadas++;
    }
  }
  return cambiadas;
};

// Usuarios con un rol que no es un id válido (antes el valor por defecto era 'defaultRoleId')
const revisarRoles = async () => {
  const sinRol = await Usuario.collection
    .find({ $or: [{ rol: { $exists: false } }, { rol: { $not: { $type: "objectId" } } }] })
    .project({ email: 1 })
    .toArray();
  sinRol.forEach((u) =>
    avisos.push(`Usuario ${u.email} no tiene un rol válido: asígnale uno desde la gestión de usuarios`),
  );
};

// Permisos del sistema de ventas anterior (ventaservicios / ventaproductos), ya eliminado
const PERMISOS_OBSOLETOS = ["Producto", "Servicio"].flatMap((tipo) =>
  ["ver", "crear", "actualizar", "eliminar"].map((accion) => `${accion}Venta${tipo}`),
);

const quitarPermisosObsoletos = async () => {
  const obsoletos = await Permiso.find({ nombrePermiso: { $in: PERMISOS_OBSOLETOS } }).select("_id");
  const ids = obsoletos.map((p) => p._id);
  if (ids.length) {
    await Rol.updateMany({}, { $pull: { permisoRol: { $in: ids } } });
    await Permiso.deleteMany({ _id: { $in: ids } });
  }
  return ids.length;
};

const migrar = async () => {
  console.log("Permisos obsoletos eliminados:", await quitarPermisosObsoletos());
  console.log("Productos con stock numérico:", await stockNumerico());
  console.log(
    "Correos normalizados:",
    (await correosEnMinusculas(Usuario, "email")) +
      (await correosEnMinusculas(Cliente, "correocliente")) +
      (await correosEnMinusculas(Empleado, "correoempleado")),
  );
  console.log("Clientes enlazados a su usuario:", await enlazarFichas(Cliente, "correocliente"));
  console.log("Empleados enlazados a su usuario:", await enlazarFichas(Empleado, "correoempleado"));
  console.log("Citas normalizadas:", await normalizarCitas());
  await revisarRoles();

  // Crea los índices declarados en los modelos (no borra los existentes)
  for (const Modelo of [Usuario, Cliente, Empleado, Producto, Cita, Venta]) await Modelo.createIndexes();
  console.log("Índices actualizados");

  if (avisos.length) {
    console.log("\nRevisa manualmente:");
    avisos.forEach((aviso) => console.log(" -", aviso));
  }
};

module.exports = { migrar };

if (require.main === module) {
  mongoose
    .connect(process.env.MONGODB_CNN)
    .then(() => console.log(`Conectado a ${mongoose.connection.name}`))
    .then(migrar)
    .catch((error) => {
      console.error("Error en la migración:", error.message);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}
