// Utilidades comunes de las pruebas de integración: cada archivo usa su propia base de datos
// (Jest los ejecuta en paralelo), cargada con el seed base y el de demo.
const request = require("supertest");
const mongoose = require("mongoose");
const Server = require("../modules/server");
const { sembrarBase } = require("../seed");
const { sembrarDemo, PASSWORD } = require("../seed-demo");

const app = new Server({ conectarDb: false }).app;

const CREDENCIALES = {
  admin: ["admin@nailsoft.local", "Admin123!"],
  empleado: ["empleado1@nailsoft.local", PASSWORD],
  empleado2: ["empleado2@nailsoft.local", PASSWORD],
  cliente: ["cliente1@nailsoft.local", PASSWORD],
  cliente2: ["cliente2@nailsoft.local", PASSWORD],
  recepcion: ["recepcion@nailsoft.local", PASSWORD],
  inventario: ["inventario@nailsoft.local", PASSWORD],
};

// Conecta a una base exclusiva para el archivo de pruebas, la limpia y la siembra
const prepararBase = async (nombre) => {
  await mongoose.connect(process.env.MONGODB_CNN, { dbName: `NailsSoft_test_${nombre}` });
  await mongoose.connection.dropDatabase();
  await sembrarBase();
  await sembrarDemo();
};

const cerrarBase = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
};

// Inicia sesión con cada usuario de prueba: { tokens, usuarios } por clave de CREDENCIALES
const iniciarSesiones = async () => {
  const tokens = {};
  const usuarios = {};
  for (const [quien, [email, password]] of Object.entries(CREDENCIALES)) {
    const res = await request(app).post("/api/auth/login").send({ email, password });
    if (res.status !== 200) throw new Error(`No se pudo iniciar sesión como ${quien}: ${res.status}`);
    tokens[quien] = res.body.token;
    usuarios[quien] = res.body.user.id;
  }
  return { tokens, usuarios };
};

module.exports = { app, request, prepararBase, cerrarBase, iniciarSesiones, PASSWORD };
