// Pruebas de seguridad de la API contra una base de datos de prueba real (MongoDB local).
// Verifican autenticación, permisos por rol, alcance "solo lo propio" y escalamiento de privilegios.
const request = require('supertest');
const mongoose = require('mongoose');
const Server = require('../modules/server');
const { sembrarBase } = require('../seed');
const { sembrarDemo, PASSWORD } = require('../seed-demo');
const Usuario = require('../modules/usuario');
const Cliente = require('../modules/cliente');
const Empleado = require('../modules/empleado');
const Cita = require('../modules/cita');
const Venta = require('../modules/venta');
const Rol = require('../modules/rol');

const app = new Server({ conectarDb: false }).app;

const credenciales = {
    admin: ['admin@nailsoft.local', 'Admin123!'],
    empleado: ['empleado1@nailsoft.local', PASSWORD],
    cliente: ['cliente1@nailsoft.local', PASSWORD],
    cliente2: ['cliente2@nailsoft.local', PASSWORD],
    recepcion: ['recepcion@nailsoft.local', PASSWORD],
    inventario: ['inventario@nailsoft.local', PASSWORD],
};
const tokens = {};
const ids = { usuario: {} };

const conToken = (quien) => ({ Authorization: `Bearer ${tokens[quien]}` });
const get = (ruta, quien) => request(app).get(ruta).set(quien ? conToken(quien) : {});

beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_CNN);
    await mongoose.connection.dropDatabase();
    await sembrarBase();
    await sembrarDemo();

    for (const [quien, [email, password]] of Object.entries(credenciales)) {
        const res = await request(app).post('/api/auth/login').send({ email, password });
        expect(res.status).toBe(200);
        tokens[quien] = res.body.token;
        ids.usuario[quien] = res.body.user.id;
    }
    ids.cliente1 = (await Cliente.findOne({ correocliente: 'cliente1@nailsoft.local' }))._id;
    ids.cliente2 = (await Cliente.findOne({ correocliente: 'cliente2@nailsoft.local' }))._id;
    ids.empleado1 = (await Empleado.findOne({ correoempleado: 'empleado1@nailsoft.local' }))._id;
    ids.rolAdmin = (await Rol.findOne({ nombreRol: 'Admin' }))._id;
}, 60000);

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
});

describe('sin iniciar sesión', () => {
    const rutas = [
        '/api/clientes', '/api/citas', '/api/ventas', '/api/empleados', '/api/insumos',
        '/api/tiposervicios', '/api/tiposervicioss', '/api/detalleservicios', '/api/servicios',
        '/api/usuarios', '/api/roles', '/api/permisos', '/api/productos', '/api/compras',
        '/api/proveedores', '/api/categoriaproductos', '/api/baja-productos',
        '/api/ventaservicios', '/api/ventaproductos', '/api/servicios/export-excel',
    ];

    it.each(rutas)('GET %s responde 401', async (ruta) => {
        expect((await get(ruta)).status).toBe(401);
    });

    it('no se puede borrar un cliente', async () => {
        const res = await request(app).delete(`/api/clientes/${ids.cliente1}`);
        expect(res.status).toBe(401);
        expect(await Cliente.exists({ _id: ids.cliente1 })).toBeTruthy();
    });

    it('rechaza un token firmado con otro secreto', async () => {
        const jwt = require('jsonwebtoken');
        const falso = jwt.sign({ userId: ids.usuario.admin }, 'secret_key');
        const res = await request(app).get('/api/usuarios').set({ Authorization: `Bearer ${falso}` });
        expect(res.status).toBe(401);
    });
});

describe('escalamiento de privilegios', () => {
    it('el registro público ignora el rol enviado y crea un cliente', async () => {
        const res = await request(app).post('/api/auth/register').send({
            nombre: 'Intruso', apellido: 'Prueba', email: 'intruso@test.local', celular: '3009990001',
            password: 'Intruso123!', confirmPassword: 'Intruso123!', rol: ids.rolAdmin, estado: true,
        });
        expect(res.status).toBe(201);
        const usuario = await Usuario.findOne({ email: 'intruso@test.local' }).populate('rol');
        expect(usuario.rol.nombreRol).toBe('Cliente');
    });

    it('un cliente no puede cambiarse el rol con update-rol', async () => {
        const res = await request(app).put(`/api/usuarios/${ids.usuario.cliente2}/update-rol`)
            .set(conToken('cliente2')).send({ rol: ids.rolAdmin });
        expect(res.status).toBe(403);
        const usuario = await Usuario.findById(ids.usuario.cliente2).populate('rol');
        expect(usuario.rol.nombreRol).toBe('Cliente');
    });

    it('un cliente no puede cambiarse el rol editando su perfil', async () => {
        const res = await request(app).put(`/api/usuarios/${ids.usuario.cliente2}`)
            .set(conToken('cliente2')).send({ nombre: 'Andrés', rol: ids.rolAdmin, estado: true });
        expect(res.status).toBe(200);
        const usuario = await Usuario.findById(ids.usuario.cliente2).populate('rol');
        expect(usuario.rol.nombreRol).toBe('Cliente');
    });

    it('un cliente no puede editar a otro usuario', async () => {
        const res = await request(app).put(`/api/usuarios/${ids.usuario.cliente}`)
            .set(conToken('cliente2')).send({ nombre: 'Hackeado' });
        expect(res.status).toBe(403);
    });

    it('un cliente no puede ver los datos de otro usuario', async () => {
        expect((await get(`/api/usuarios/${ids.usuario.admin}`, 'cliente')).status).toBe(404);
        expect((await get(`/api/usuarios/${ids.usuario.cliente}`, 'cliente')).status).toBe(200);
    });

    it('el sanitizador bloquea inyección de operadores en el login', async () => {
        const res = await request(app).post('/api/auth/login')
            .send({ email: { $ne: null }, password: { $ne: null } });
        expect(res.status).not.toBe(200);
        expect(res.body.token).toBeUndefined();
    });
});

describe('cada quien ve solo lo suyo', () => {
    it('un cliente solo recibe sus propias citas', async () => {
        const res = await get('/api/citas', 'cliente');
        expect(res.status).toBe(200);
        expect(res.body.citas.length).toBe(await Cita.countDocuments({ nombrecliente: ids.cliente1 }));
        expect(res.body.citas.every((c) => String(c.nombrecliente._id) === String(ids.cliente1))).toBe(true);
    });

    it('un cliente no puede abrir la cita de otro cliente', async () => {
        const ajena = await Cita.findOne({ nombrecliente: ids.cliente2 });
        expect((await get(`/api/citas/${ajena._id}`, 'cliente')).status).toBe(404);
    });

    it('un cliente no puede cancelar la cita de otro cliente', async () => {
        const ajena = await Cita.findOne({ nombrecliente: ids.cliente2, estadocita: 'Pendiente' });
        const res = await request(app).put(`/api/citas/${ajena._id}/cancelar`)
            .set(conToken('cliente')).send({ motivo: 'prueba' });
        expect(res.status).toBe(404);
        expect((await Cita.findById(ajena._id)).estadocita).toBe('Pendiente');
    });

    it('un cliente solo agenda a su propio nombre', async () => {
        const otra = await Cita.findOne({ nombrecliente: ids.cliente1 }).lean();
        const res = await request(app).post('/api/citas').set(conToken('cliente')).send({
            nombreempleado: otra.nombreempleado, nombrecliente: ids.cliente2,
            fechacita: new Date(Date.now() + 10 * 86400000), horacita: '10:00',
            duracionTotal: otra.duracionTotal, montototal: otra.montototal,
            estadocita: 'Completada', servicios: otra.servicios,
        });
        expect(res.status).toBe(201);
        expect(String(res.body.cita.nombrecliente)).toBe(String(ids.cliente1));
        expect(res.body.cita.estadocita).not.toBe('Completada');
    });

    it('un cliente solo recibe sus propias ventas', async () => {
        const res = await get('/api/ventas', 'cliente');
        expect(res.status).toBe(200);
        expect(res.body.ventas.length).toBe(await Venta.countDocuments({ cliente: ids.cliente1 }));
    });

    it('un cliente no puede abrir la venta de otro cliente', async () => {
        const ajena = await Venta.findOne({ cliente: ids.cliente2 });
        expect((await get(`/api/ventas/${ajena._id}`, 'cliente')).status).toBe(404);
    });

    it('un cliente solo ve su propio registro de cliente y su perfil', async () => {
        const lista = await get('/api/clientes', 'cliente');
        expect(lista.body.map((c) => String(c._id))).toEqual([String(ids.cliente1)]);
        expect((await get(`/api/clientes/${ids.cliente2}`, 'cliente')).status).toBe(404);
        const perfil = await get('/api/clientes/perfil', 'cliente');
        expect(perfil.status).toBe(200);
        expect(String(perfil.body.cliente._id)).toBe(String(ids.cliente1));
    });

    it('un cliente no puede cambiarse el correo ni el estado', async () => {
        await request(app).put(`/api/clientes/${ids.cliente1}`).set(conToken('cliente'))
            .send({ correocliente: 'otro@test.local', estadocliente: false, nombrecliente: 'Sofía' });
        const cliente = await Cliente.findById(ids.cliente1);
        expect(cliente.correocliente).toBe('cliente1@nailsoft.local');
        expect(cliente.estadocliente).toBe(true);
    });

    it('un cliente ve empleados sin datos de contacto', async () => {
        const res = await get('/api/empleados', 'cliente');
        expect(res.status).toBe(200);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0].correoempleado).toBeUndefined();
        expect(res.body[0].telefonoempleado).toBeUndefined();
    });

    it('un empleado solo ve las citas que tiene asignadas', async () => {
        const res = await get('/api/citas', 'empleado');
        expect(res.status).toBe(200);
        expect(res.body.citas.length).toBe(await Cita.countDocuments({ nombreempleado: ids.empleado1 }));
    });

    it('la recepcionista ve todas las citas y los contactos de empleados', async () => {
        const citas = await get('/api/citas', 'recepcion');
        expect(citas.body.citas.length).toBe(await Cita.countDocuments());
        const empleados = await get('/api/empleados', 'recepcion');
        expect(empleados.body[0].correoempleado).toBeDefined();
    });
});

describe('permisos por rol (incluye roles que el código no conoce por nombre)', () => {
    const matriz = [
        // [ruta, quien, estado esperado]
        ['/api/usuarios', 'admin', 200],
        ['/api/usuarios', 'recepcion', 403],
        ['/api/usuarios', 'cliente', 403],
        ['/api/productos', 'inventario', 200],
        ['/api/productos', 'recepcion', 403],
        ['/api/insumos', 'inventario', 200],
        ['/api/insumos', 'cliente', 403],
        ['/api/compras', 'inventario', 200],
        ['/api/compras', 'empleado', 403],
        ['/api/clientes', 'recepcion', 200],
        ['/api/ventas', 'inventario', 403],
        ['/api/citas', 'inventario', 403],
        ['/api/roles', 'recepcion', 403],
    ];

    it.each(matriz)('GET %s como %s → %i', async (ruta, quien, esperado) => {
        expect((await get(ruta, quien)).status).toBe(esperado);
    });

    it('un permiso desactivado deja de funcionar al instante', async () => {
        const Permiso = require('../modules/permiso');
        await Permiso.updateOne({ nombrePermiso: 'verProducto' }, { activo: false });
        const res = await get('/api/productos', 'inventario');
        await Permiso.updateOne({ nombrePermiso: 'verProducto' }, { activo: true });
        expect(res.status).toBe(403);
        expect(res.body.permisoDesactivado).toBe(true);
    });

    it('un usuario desactivado no puede usar su token', async () => {
        await Usuario.updateOne({ _id: ids.usuario.inventario }, { estado: false });
        const res = await get('/api/productos', 'inventario');
        await Usuario.updateOne({ _id: ids.usuario.inventario }, { estado: true });
        expect(res.status).toBe(401);
    });
});

describe('subida de imágenes', () => {
    it('sin permiso no se acepta ningún archivo', async () => {
        const res = await request(app).post('/api/productos').set(conToken('cliente'))
            .attach('imagen', Buffer.from('<script>alert(1)</script>'), 'ataque.html');
        expect(res.status).toBe(403);
    });

    it('con permiso se rechazan archivos que no son imágenes', async () => {
        const res = await request(app).post('/api/productos').set(conToken('inventario'))
            .attach('imagen', Buffer.from('<script>alert(1)</script>'), { filename: 'ataque.html', contentType: 'text/html' });
        expect(res.status).toBe(400);
    });
});
