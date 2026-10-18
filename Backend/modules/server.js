const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { dbConnection } = require('../database/config');
const { sanitizar } = require('../middlewares/sanitizar');
const { CARPETA_UPLOADS } = require('../middlewares/subirImagen');

const esPrueba = process.env.NODE_ENV === 'test';

// Orígenes permitidos para CORS: CORS_ORIGINS separados por coma, o cualquier
// localhost/127.0.0.1 (cualquier puerto) si no se configura
const origenesPermitidos = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origen) => origen.trim())
    .filter(Boolean);

const origenPermitido = (origen) =>
    !origen || // apps nativas, curl y peticiones del mismo origen no envían Origin
    (origenesPermitidos.length
        ? origenesPermitidos.includes(origen)
        : /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origen));

// Límite de peticiones por IP en una ventana de 15 minutos
const limitar = (max, message) => rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => esPrueba,
    message: { message, msg: message },
});

class Server {
    constructor({ conectarDb = true } = {}) {
        this.app = express();
        this.port = process.env.PORT || 3000;

        this.middlewares();
        this.routes();
        this.manejoErrores();
        if (conectarDb) this.connectDb();
    }

    listen() {
        this.app.listen(this.port, () => {
            console.log(`Escuchando por el puerto ${this.port}`);
        });
    }

    middlewares() {
        // Cabeceras de seguridad; las imágenes de /uploads se cargan desde el frontend en otro origen
        this.app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

        this.app.use(cors({
            origin: (origen, callback) => callback(null, origenPermitido(origen)),
        }));

        this.app.use(compression());
        this.app.use(express.json({ limit: '1mb' }));
        this.app.use(sanitizar);

        // Archivos subidos (imágenes de servicios y productos)
        this.app.use('/uploads', express.static(CARPETA_UPLOADS));

        // Límites contra fuerza bruta en autenticación y contra abuso general de la API
        this.app.use('/api/auth/login', limitar(10, 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.'));
        this.app.use('/api/auth/register', limitar(10, 'Demasiados registros desde esta conexión. Intenta más tarde.'));
        this.app.use(
            ['/api/auth/request-password-reset', '/api/auth/verify-reset-token', '/api/auth/reset-password'],
            limitar(10, 'Demasiados intentos de recuperación de contraseña. Intenta de nuevo en 15 minutos.')
        );
        this.app.use('/api', limitar(2000, 'Demasiadas peticiones. Intenta de nuevo en unos minutos.'));
    }

    routes() {
        this.app.use('/api/usuarios', require('../routes/usuarios'));
        this.app.use('/api/roles', require('../routes/roles'));
        this.app.use('/api/permisos', require('../routes/permisos'));
        this.app.use('/api/tiposervicios', require('../routes/tiposervs'));
        this.app.use('/api/tiposervicioss', require('../routes/tiposervicioss'));
        this.app.use('/api/servicios', require('../routes/servicios'));
        this.app.use('/api/detalleservicios', require('../routes/detalleservicios'));
        this.app.use('/api/ventaservicios', require('../routes/ventaservicios'));
        this.app.use('/api/insumos', require('../routes/insumos'));
        this.app.use('/api/empleados', require('../routes/empleados'));
        this.app.use('/api/clientes', require('../routes/clientes'));
        this.app.use('/api/citas', require('../routes/citas'));
        this.app.use('/api/proveedores', require('../routes/proveedor'));
        this.app.use('/api/categoriaproductos', require('../routes/categoriaProductos'));
        this.app.use('/api/productos', require('../routes/productos'));
        this.app.use('/api/ventaproductos', require('../routes/ventaproductos'));
        this.app.use('/api/compras', require('../routes/compra'));
        this.app.use('/api/auth', require('../routes/auth'));
        this.app.use('/api/baja-productos', require('../routes/bajaproducto'));
        this.app.use('/api/ventas', require('../routes/venta'));
    }

    manejoErrores() {
        this.app.use('/api', (req, res) => {
            res.status(404).json({ msg: 'Ruta no encontrada' });
        });

        // eslint-disable-next-line no-unused-vars
        this.app.use((error, req, res, next) => {
            if (error.type === 'entity.parse.failed') {
                return res.status(400).json({ msg: 'El cuerpo de la petición no es JSON válido' });
            }
            if (error.type === 'entity.too.large') {
                return res.status(413).json({ msg: 'La petición es demasiado grande' });
            }
            console.error('Error no controlado:', error);
            res.status(500).json({ msg: 'Error interno del servidor' });
        });
    }

    async connectDb() {
        await dbConnection();
    }
}

module.exports = Server;
