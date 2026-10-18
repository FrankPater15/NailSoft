// Crea los permisos, los roles base (Admin, Empleado, Cliente) y un usuario administrador.
// Se puede ejecutar varias veces: actualiza lo que ya existe en vez de duplicarlo.
// Uso: npm run seed
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Permiso = require('./modules/permiso');
const Rol = require('./modules/rol');
const Usuario = require('./modules/usuario');

// [nombrePermiso, categoria, nivel, descripcion]
const permisos = [
    // Permisos que revisa el backend (middleware verificarPermisos)
    ['verRoles', 'roles', 'read', 'Consultar los roles'],
    ['crearRol', 'roles', 'write', 'Crear roles nuevos'],
    ['actualizarRol', 'roles', 'write', 'Editar roles existentes'],
    ['eliminarRol', 'roles', 'delete', 'Eliminar roles'],
    ['verPermisos', 'permisos', 'read', 'Consultar los permisos'],
    ['crearPermisos', 'permisos', 'write', 'Crear permisos nuevos'],
    ['actualizarPermisos', 'permisos', 'write', 'Editar permisos existentes'],
    ['eliminarPermisos', 'permisos', 'delete', 'Eliminar permisos'],
    ['verServicios', 'servicios', 'read', 'Consultar los servicios'],
    ['crearServicios', 'servicios', 'write', 'Crear servicios nuevos'],
    ['actualizarServicios', 'servicios', 'write', 'Editar servicios existentes'],
    ['eliminarServicios', 'servicios', 'delete', 'Eliminar servicios'],
    ['verCliente', 'clientes', 'read', 'Consultar los clientes'],
    ['crearCliente', 'clientes', 'write', 'Crear clientes nuevos'],
    ['actualizarCliente', 'clientes', 'write', 'Editar clientes existentes'],
    ['eliminarCliente', 'clientes', 'delete', 'Eliminar clientes'],
    ['verCompras', 'compras', 'read', 'Consultar las compras'],
    ['crearCompras', 'compras', 'write', 'Registrar compras nuevas'],
    ['actualizarCompras', 'compras', 'write', 'Editar compras existentes'],
    ['eliminarCompras', 'compras', 'delete', 'Eliminar compras'],
    ['verUsuarios', 'usuarios', 'read', 'Consultar los usuarios'],
    ['crearUsuarios', 'usuarios', 'write', 'Crear usuarios nuevos'],
    ['actualizarUsuarios', 'usuarios', 'write', 'Editar usuarios existentes'],
    ['eliminarUsuarios', 'usuarios', 'delete', 'Eliminar usuarios'],
    ['verProducto', 'productos', 'read', 'Consultar los productos'],
    ['crearProducto', 'productos', 'write', 'Crear productos nuevos'],
    ['actualizarProducto', 'productos', 'write', 'Editar productos existentes'],
    ['eliminarProducto', 'productos', 'delete', 'Eliminar productos'],
    ['verCategoriaProducto', 'categoriaProductos', 'read', 'Consultar las categorías de producto'],
    ['crearCategoriaProducto', 'categoriaProductos', 'write', 'Crear categorías de producto'],
    ['actualizarCategoriaProducto', 'categoriaProductos', 'write', 'Editar categorías de producto'],
    ['eliminarCategoriaProducto', 'categoriaProductos', 'delete', 'Eliminar categorías de producto'],
    ['verProveedor', 'proveedores', 'read', 'Consultar los proveedores'],
    ['crearProveedor', 'proveedores', 'write', 'Crear proveedores nuevos'],
    ['actualizarProveedor', 'proveedores', 'write', 'Editar proveedores existentes'],
    ['eliminarProveedor', 'proveedores', 'delete', 'Eliminar proveedores'],
    ['verBajaProductos', 'bajaProductos', 'read', 'Consultar las bajas de producto'],
    ['crearBajaProducto', 'bajaProductos', 'write', 'Registrar bajas de producto'],
    ['eliminarBajaProducto', 'bajaProductos', 'delete', 'Eliminar bajas de producto'],
    ['verVentaProducto', 'ventas', 'read', 'Consultar las ventas de productos'],
    ['crearVentaProducto', 'ventas', 'write', 'Registrar ventas de productos'],
    ['actualizarVentaProducto', 'ventas', 'write', 'Editar ventas de productos'],
    ['eliminarVentaProducto', 'ventas', 'delete', 'Eliminar ventas de productos'],
    ['verVentaServicio', 'ventas', 'read', 'Consultar las ventas de servicios'],
    ['crearVentaServicio', 'ventas', 'write', 'Registrar ventas de servicios'],
    ['actualizarVentaServicio', 'ventas', 'write', 'Editar ventas de servicios'],
    ['eliminarVentaServicio', 'ventas', 'delete', 'Eliminar ventas de servicios'],

    // Permisos de menú que usa el frontend para mostrar las vistas del sidebar
    ['visualizarDashboardMenu', 'vistasSidebar', 'read', 'Ver el menú del dashboard'],
    ['verDashboard', 'vistasSidebar', 'read', 'Ver el panel de reportes'],
    ['visualizarCitaEnProgresoMenu', 'vistasSidebar', 'read', 'Ver el menú de citas en progreso'],
    ['verAgendaEmpleadosMenu', 'vistasSidebar', 'read', 'Ver el menú de agenda de empleados'],
    ['verCitasMenu', 'vistasSidebar', 'read', 'Ver el menú de citas'],
    ['verCatalogoMenu', 'vistasSidebar', 'read', 'Ver el menú del catálogo'],
    ['verServiciosMenu', 'vistasSidebar', 'read', 'Ver el menú de servicios'],
    ['verTipoServiciosMenu', 'vistasSidebar', 'read', 'Ver el menú de tipos de servicio'],
    ['verTipoDescuentoMenu', 'vistasSidebar', 'read', 'Ver el menú de tipos de descuento'],
    ['verVentasMenu', 'vistasSidebar', 'read', 'Ver el menú de ventas'],
    ['verVentasUnificadasMenu', 'vistasSidebar', 'read', 'Ver el menú de ventas unificadas'],
    ['verComprasMenu', 'vistasSidebar', 'read', 'Ver el menú de compras'],
    ['verProveedoresMenu', 'vistasSidebar', 'read', 'Ver el menú de proveedores'],
    ['verProductosMenu', 'vistasSidebar', 'read', 'Ver el menú de productos'],
    ['verCategoriaProductosMenu', 'vistasSidebar', 'read', 'Ver el menú de categorías de producto'],
    ['verInsumosMenu', 'vistasSidebar', 'read', 'Ver el menú de insumos'],
    ['verBajaProductoMenu', 'vistasSidebar', 'read', 'Ver el menú de bajas de producto'],
    ['verClientesMenu', 'vistasSidebar', 'read', 'Ver el menú de clientes'],
    ['verEmpleadosMenu', 'vistasSidebar', 'read', 'Ver el menú de empleados'],
    ['verUsuariosMenu', 'vistasSidebar', 'read', 'Ver el menú de usuarios'],
    ['visualizarRolesMenu', 'vistasSidebar', 'read', 'Ver el menú de roles'],
    ['verPermisosMenu', 'vistasSidebar', 'read', 'Ver el menú de permisos'],
    ['verConfiguracionMenu', 'vistasSidebar', 'read', 'Ver el menú de configuración'],
];

// Permisos iniciales de cada rol; luego se pueden cambiar desde la aplicación
const roles = {
    Admin: { esAdmin: true, permisos: permisos.map(([nombre]) => nombre) },
    Empleado: {
        esAdmin: false,
        permisos: [
            'visualizarCitaEnProgresoMenu', 'verAgendaEmpleadosMenu', 'verCitasMenu',
            'verServiciosMenu', 'verServicios', 'verCliente',
        ],
    },
    Cliente: { esAdmin: false, permisos: ['verCatalogoMenu', 'verCitasMenu', 'verServicios'] },
    // Roles extra para probar permisos dinámicos con roles que el código no conoce por nombre
    Recepcionista: {
        esAdmin: false,
        permisos: [
            'visualizarDashboardMenu', 'verCitasMenu', 'verAgendaEmpleadosMenu', 'visualizarCitaEnProgresoMenu',
            'verClientesMenu', 'verCliente', 'crearCliente', 'actualizarCliente',
            'verServiciosMenu', 'verServicios', 'verCatalogoMenu',
            'verVentasUnificadasMenu', 'verVentasMenu', 'verVentaServicio', 'crearVentaServicio',
            'verVentaProducto', 'crearVentaProducto',
        ],
    },
    Inventario: {
        esAdmin: false,
        permisos: [
            'verProductosMenu', 'verProducto', 'crearProducto', 'actualizarProducto', 'eliminarProducto',
            'verCategoriaProductosMenu', 'verCategoriaProducto', 'crearCategoriaProducto', 'actualizarCategoriaProducto',
            'verInsumosMenu', 'verBajaProductoMenu', 'verBajaProductos', 'crearBajaProducto',
            'verProveedoresMenu', 'verProveedor', 'crearProveedor', 'actualizarProveedor',
            'verComprasMenu', 'verCompras', 'crearCompras', 'actualizarCompras',
        ],
    },
};

const admin = {
    nombre: 'Admin',
    apellido: 'NailSoft',
    email: (process.env.SEED_ADMIN_EMAIL || 'admin@nailsoft.local').toLowerCase(),
    celular: '3000000000',
    password: process.env.SEED_ADMIN_PASSWORD || 'Admin123!',
};

const seed = async () => {
    await mongoose.connect(process.env.MONGODB_CNN);
    console.log(`Conectado a ${mongoose.connection.name}`);

    const idsPorNombre = {};
    for (const [nombrePermiso, categoria, nivel, descripcion] of permisos) {
        const permiso = await Permiso.findOneAndUpdate(
            { nombrePermiso },
            { $set: { categoria, nivel, descripcion, activo: true } },
            { upsert: true, new: true, runValidators: true }
        );
        idsPorNombre[nombrePermiso] = permiso._id;
    }
    console.log(`Permisos: ${permisos.length}`);

    const idsRoles = {};
    for (const [nombreRol, { esAdmin, permisos: nombres }] of Object.entries(roles)) {
        const rol = await Rol.findOneAndUpdate(
            { nombreRol },
            { $set: { esAdmin, estadoRol: true, permisoRol: nombres.map((n) => idsPorNombre[n]) } },
            { upsert: true, new: true, runValidators: true }
        );
        idsRoles[nombreRol] = rol._id;
    }
    console.log(`Roles: ${Object.keys(roles).join(', ')}`);

    const existente = await Usuario.findOne({ email: admin.email });
    if (existente) {
        console.log(`El usuario ${admin.email} ya existe; no se modificó`);
    } else {
        await Usuario.create({
            ...admin,
            password: await bcrypt.hash(admin.password, 10),
            rol: idsRoles.Admin,
            estado: true,
        });
        console.log(`Administrador creado: ${admin.email} / ${admin.password}`);
    }
};

seed()
    .catch((error) => {
        console.error('Error en el seed:', error.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
