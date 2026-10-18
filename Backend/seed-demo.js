// Carga usuarios de prueba (uno por rol) y datos de ejemplo para probar la aplicación.
// Requiere haber corrido antes `npm run seed` (permisos y roles).
// Se puede ejecutar varias veces: no duplica lo que ya existe.
// Uso: npm run seed:demo
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Rol = require('./modules/rol');
const Usuario = require('./modules/usuario');
const TipoServicios = require('./modules/tiposervicios');
const TipoServ = require('./modules/tiposerv');
const Servicio = require('./modules/servicio');
const CatProducto = require('./modules/categoriaproducto');
const Producto = require('./modules/producto');
const Proveedor = require('./modules/proveedor');
const Insumo = require('./modules/insumo');
const Cita = require('./modules/cita');
const Venta = require('./modules/venta');
const Contador = require('./modules/contador');
const { inicioDeCita } = require('./services/agenda');
const { asegurarCliente, asegurarEmpleado } = require('./services/personas');

const PASSWORD = process.env.SEED_DEMO_PASSWORD || 'Prueba123!';

// [nombre, apellido, email, celular, rol]
const usuarios = [
    ['Laura', 'Gómez', 'empleado1@nailsoft.local', '3001110001', 'Empleado'],
    ['Camila', 'Ríos', 'empleado2@nailsoft.local', '3001110002', 'Empleado'],
    ['Sofía', 'Martínez', 'cliente1@nailsoft.local', '3002220001', 'Cliente'],
    ['Andrés', 'López', 'cliente2@nailsoft.local', '3002220002', 'Cliente'],
    ['Valentina', 'Pérez', 'recepcion@nailsoft.local', '3003330001', 'Recepcionista'],
    ['Julián', 'Castro', 'inventario@nailsoft.local', '3004440001', 'Inventario'],
];

// Busca por `filtro` y crea el documento solo si no existe
const crearSiNoExiste = async (Model, filtro, datos = {}) =>
    (await Model.findOne(filtro)) || Model.create({ ...filtro, ...datos });

// Fecha a `dias` de hoy, a medianoche
const fechaRelativa = (dias) => {
    const fecha = new Date();
    fecha.setHours(0, 0, 0, 0);
    fecha.setDate(fecha.getDate() + dias);
    return fecha;
};

const crearUsuarios = async () => {
    const hash = await bcrypt.hash(PASSWORD, 10);
    const empleados = [];
    const clientes = [];

    for (const [nombre, apellido, email, celular, nombreRol] of usuarios) {
        const rol = await Rol.findOne({ nombreRol });
        if (!rol) throw new Error(`No existe el rol ${nombreRol}. Corre primero: npm run seed`);

        const usuario = await crearSiNoExiste(Usuario, { email }, { nombre, apellido, celular, password: hash, rol: rol._id, estado: true });

        // Empleados y clientes quedan enlazados a su usuario
        if (nombreRol === 'Empleado') empleados.push(await asegurarEmpleado(usuario));
        if (nombreRol === 'Cliente') clientes.push(await asegurarCliente(usuario));
    }
    console.log(`Usuarios de prueba: ${usuarios.length} (contraseña ${PASSWORD})`);
    return { empleados, clientes };
};

const crearCatalogo = async () => {
    const tipos = {};
    for (const nombreTipoServicio of ['Manicure', 'Pedicure', 'Uñas acrílicas', 'Spa de manos']) {
        tipos[nombreTipoServicio] = await crearSiNoExiste(TipoServicios, { nombreTipoServicio }, { activo: true });
    }

    const normal = await crearSiNoExiste(TipoServ, { nombreTs: 'Normal' }, { descuento: 0, esPromocional: false });
    const promo = await crearSiNoExiste(TipoServ, { nombreTs: 'Promoción de temporada' }, { descuento: 15, esPromocional: true });

    // [nombre, descripción, precio, minutos, categoría, descuento, imagen en uploads/]
    const datosServicios = [
        ['Manicure tradicional', 'Limpieza, limado y esmaltado clásico', 25000, 45, 'Manicure', normal, 'img1.jpg'],
        ['Manicure semipermanente', 'Esmaltado en gel que dura hasta tres semanas', 45000, 60, 'Manicure', normal, 'img3.jpg'],
        ['Pedicure spa', 'Exfoliación, hidratación y esmaltado de pies', 40000, 60, 'Pedicure', promo, 'img4.jpg'],
        ['Uñas acrílicas', 'Extensión en acrílico con diseño básico', 90000, 120, 'Uñas acrílicas', normal, 'img5.jpg'],
        ['Retiro de acrílico', 'Retiro seguro y nutrición de la uña natural', 30000, 30, 'Uñas acrílicas', normal, 'img6.jpg'],
        ['Parafina para manos', 'Tratamiento de parafina caliente e hidratación', 35000, 40, 'Spa de manos', promo, 'img7.jpg'],
    ];
    const servicios = [];
    for (const [nombreServicio, descripcion, precio, tiempo, tipo, descuento, imagenUrl] of datosServicios) {
        servicios.push(await crearSiNoExiste(Servicio, { nombreServicio }, {
            descripcion, precio, tiempo, tipoServicio: descuento._id, tipoServicio2: tipos[tipo]._id, estado: true, imagenUrl,
        }));
    }
    console.log(`Servicios: ${servicios.length}`);
    return servicios;
};

const crearInventario = async () => {
    const categorias = {};
    for (const [nombreCp, descripcionCp] of [
        ['Esmaltes', 'Esmaltes tradicionales y semipermanentes'],
        ['Herramientas', 'Limas, cortaúñas y accesorios de manicure'],
        ['Cuidado', 'Cremas, aceites y removedores'],
    ]) {
        categorias[nombreCp] = await crearSiNoExiste(CatProducto, { nombreCp }, { descripcionCp, activo: true });
    }

    const productos = [];
    for (const [nombreProducto, precio, stock, categoria] of [
        ['Esmalte rojo pasión', 18000, '25', 'Esmaltes'],
        ['Esmalte nude', 18000, '30', 'Esmaltes'],
        ['Lima profesional', 8000, '40', 'Herramientas'],
        ['Cortaúñas acero', 12000, '15', 'Herramientas'],
        ['Aceite para cutícula', 22000, '20', 'Cuidado'],
        ['Removedor sin acetona', 15000, '18', 'Cuidado'],
    ]) {
        productos.push(await crearSiNoExiste(Producto, { nombreProducto }, {
            precio, stock, categoria: categorias[categoria]._id, estado: true,
        }));
    }

    for (const [nombreProveedor, contacto, numeroContacto, provee] of [
        ['Distribuidora Belleza Total', 'Marta Ruiz', 3105550001, 'Esmaltes y removedores'],
        ['Insumos Nail Pro', 'Carlos Díaz', 3105550002, 'Herramientas y acrílicos'],
    ]) {
        await crearSiNoExiste(Proveedor, { nombreProveedor }, { contacto, numeroContacto, provee, estado: true });
    }

    for (const [nombreInsumo, stock, precio] of [
        ['Algodón (paquete)', 50, 3000],
        ['Guantes de nitrilo (caja)', 10, 25000],
        ['Polvo acrílico', 8, 60000],
        ['Toallas desechables', 100, 500],
    ]) {
        await crearSiNoExiste(Insumo, { nombreInsumo }, { stock, precio, estado: true });
    }
    console.log(`Productos: ${productos.length}, proveedores e insumos listos`);
    return productos;
};

const crearCitasYVentas = async ({ empleados, clientes }, servicios, productos) => {
    if (await Cita.exists({})) {
        console.log('Ya hay citas; no se crearon citas ni ventas de ejemplo');
        return;
    }

    const lineaServicio = (s) => ({ servicio: s._id, nombreServicio: s.nombreServicio, precio: s.precio, tiempo: s.tiempo });
    const nuevaCita = (empleado, cliente, dias, horacita, estadocita, items) => Cita.create({
        nombreempleado: empleado._id,
        nombrecliente: cliente._id,
        fechacita: inicioDeCita(fechaRelativa(dias), horacita),
        horacita,
        estadocita,
        servicios: items.map(lineaServicio),
        duracionTotal: items.reduce((t, s) => t + s.tiempo, 0),
        montototal: items.reduce((t, s) => t + s.precio, 0),
    });

    const [e1, e2] = empleados;
    const [c1, c2] = clientes;
    const [manicure, semi, pedicure, acrilicas, , parafina] = servicios;

    const pasada1 = await nuevaCita(e1, c1, -7, '10:00', 'Completada', [semi]);
    const pasada2 = await nuevaCita(e2, c2, -3, '15:00', 'Completada', [pedicure, parafina]);
    await nuevaCita(e1, c2, -1, '11:00', 'Cancelada', [manicure]);
    await nuevaCita(e1, c1, 0, '09:00', 'Confirmada', [manicure]);
    await nuevaCita(e2, c2, 0, '14:00', 'Pendiente', [acrilicas]);
    await nuevaCita(e2, c1, 2, '16:00', 'Pendiente', [pedicure]);
    console.log('Citas: 6 (pasadas, de hoy y futuras)');

    const siguienteCodigo = async () => {
        const { secuencia } = await Contador.findOneAndUpdate(
            { nombre: 'venta' }, { $inc: { secuencia: 1 } }, { new: true, upsert: true }
        );
        return `V${secuencia.toString().padStart(4, '0')}`;
    };
    const lineaVenta = (s) => ({ ...lineaServicio(s), precioFinal: s.precio, descuentoAplicado: 0 });

    for (const [cita, cliente, empleado, items, extra, metodoPago] of [
        [pasada1, c1, e1, [semi], [productos[0]], 'Tarjeta'],
        [pasada2, c2, e2, [pedicure, parafina], [], 'Efectivo'],
    ]) {
        await Venta.create({
            codigoVenta: await siguienteCodigo(),
            cliente: cliente._id,
            empleado: empleado._id,
            cita: cita._id,
            servicios: items.map(lineaVenta),
            productos: extra.map((p) => ({
                producto: p._id, nombreProducto: p.nombreProducto, precio: p.precio, cantidad: 1, subtotal: p.precio,
            })),
            total: 0, // lo recalcula el pre('save') del modelo
            metodoPago,
            estado: true,
            fechaCreacion: cita.fechacita,
            fechaFinalizacion: cita.fechacita,
        });
    }
    console.log('Ventas: 2 finalizadas');
};

// Carga los datos de ejemplo. Usa la conexión de mongoose abierta.
const sembrarDemo = async () => {
    const personas = await crearUsuarios();
    const servicios = await crearCatalogo();
    const productos = await crearInventario();
    await crearCitasYVentas(personas, servicios, productos);
};

module.exports = { sembrarDemo, PASSWORD };

if (require.main === module) {
    mongoose.connect(process.env.MONGODB_CNN)
        .then(() => console.log(`Conectado a ${mongoose.connection.name}`))
        .then(sembrarDemo)
        .catch((error) => {
            console.error('Error en el seed de demo:', error.message);
            process.exitCode = 1;
        })
        .finally(() => mongoose.disconnect());
}
