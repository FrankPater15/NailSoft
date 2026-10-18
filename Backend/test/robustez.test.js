// Ninguna ruta debe responder 500 ante datos vacíos o con tipos equivocados: eso indica una
// entrada sin validar. Se prueban todas las rutas del servidor como administrador.
const { app, request, prepararBase, cerrarBase, iniciarSesiones } = require("./ayuda");
const { RUTAS } = require("../modules/server");

let tokens = {};

const pedir = (metodo, ruta) => request(app)[metodo.toLowerCase()](ruta);

const ID_INEXISTENTE = "000000000000000000000000";

// [MÉTODO, ruta con un id válido que no existe, ruta con un id mal formado]
const rutas = RUTAS.flatMap(([prefijo, router]) =>
  router.stack
    .filter((capa) => capa.route)
    .flatMap((capa) =>
      Object.keys(capa.route.methods).map((metodo) => {
        const ruta = `${prefijo}${capa.route.path === "/" ? "" : capa.route.path}`;
        return [metodo.toUpperCase(), ruta.replace(/:\w+/g, ID_INEXISTENTE), ruta.replace(/:\w+/g, "no-es-un-id")];
      }),
    ),
);
const conCuerpo = rutas.filter(([metodo]) => ["POST", "PUT", "PATCH"].includes(metodo));
const conId = rutas.filter(([, conIdValido, conIdMalo]) => conIdValido !== conIdMalo);

const CUERPOS_RAROS = {
  vacio: {},
  tiposEquivocados: {
    nombre: 123,
    email: ["a"],
    precio: "mucho",
    stock: -1,
    servicios: "x",
    productos: { a: 1 },
    fecha: "ayer",
    estado: "quizás",
    cantidad: null,
  },
};

beforeAll(async () => {
  await prepararBase("robustez");
  ({ tokens } = await iniciarSesiones());
}, 60000);

afterAll(cerrarBase);

describe.each(Object.entries(CUERPOS_RAROS))("cuerpo %s", (_, cuerpo) => {
  it.each(conCuerpo)("%s %s no responde 500", async (metodo, ruta) => {
    const res = await pedir(metodo, ruta)
      .set({ Authorization: `Bearer ${tokens.admin}` })
      .send(cuerpo);
    expect(res.status).toBeLessThan(500);
  });
});

describe("errores en funciones async", () => {
  it("protegerRouter manda el error al manejador en vez de tumbar el proceso", async () => {
    const express = require("express");
    const { protegerRouter } = require("../utils/capturarAsync");
    const router = express.Router();
    router.get("/falla", async () => {
      throw new Error("falla a propósito");
    });
    const mini = express();
    mini.use(protegerRouter(router));
    mini.use((error, req, res, next) => res.status(500).json({ msg: error.message }));

    const res = await request(mini).get("/falla");
    expect(res.status).toBe(500);
    expect(res.body.msg).toBe("falla a propósito");
  });
});

describe("id mal formado", () => {
  it.each(conId)("%s %s no responde 500", async (metodo, _, ruta) => {
    const res = await pedir(metodo, ruta)
      .set({ Authorization: `Bearer ${tokens.admin}` })
      .send({});
    expect(res.status).toBeLessThan(500);
  });
});
