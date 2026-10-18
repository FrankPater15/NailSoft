// Pruebas de reglas de negocio: precios, descuentos y stock de ventas; choques y horario de citas;
// fichas de cliente/empleado; sesiones tras cambiar la contraseña.
const { app, request, prepararBase, cerrarBase, iniciarSesiones, PASSWORD } = require("./ayuda");
const Producto = require("../modules/producto");
const Servicio = require("../modules/servicio");
const Cliente = require("../modules/cliente");
const Empleado = require("../modules/empleado");
const Cita = require("../modules/cita");
const Venta = require("../modules/venta");
const Rol = require("../modules/rol");
const Usuario = require("../modules/usuario");

let tokens = {};
let usuarios = {};
const datos = {};

const como = (quien) => ({ Authorization: `Bearer ${tokens[quien]}` });
const post = (ruta, quien, cuerpo) => request(app).post(ruta).set(como(quien)).send(cuerpo);
const put = (ruta, quien, cuerpo) => request(app).put(ruta).set(como(quien)).send(cuerpo);

// "YYYY-MM-DD" dentro de `dias` días
const fecha = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const stockDe = async (id) => (await Producto.findById(id)).stock;

beforeAll(async () => {
  await prepararBase("logica");
  ({ tokens, usuarios } = await iniciarSesiones());
  datos.esmalte = await Producto.findOne({ nombreProducto: "Esmalte rojo pasión" });
  datos.lima = await Producto.findOne({ nombreProducto: "Lima profesional" });
  datos.manicure = await Servicio.findOne({ nombreServicio: "Manicure tradicional" });
  datos.pedicure = await Servicio.findOne({ nombreServicio: "Pedicure spa" });
  datos.cliente1 = await Cliente.findOne({ correocliente: "cliente1@nailsoft.local" });
  datos.cliente2 = await Cliente.findOne({ correocliente: "cliente2@nailsoft.local" });
  datos.empleado1 = await Empleado.findOne({ correoempleado: "empleado1@nailsoft.local" });
  datos.empleado2 = await Empleado.findOne({ correoempleado: "empleado2@nailsoft.local" });
}, 60000);

afterAll(cerrarBase);

const ventaBase = (extra = {}) => ({
  cliente: datos.cliente1._id,
  empleado: datos.empleado1._id,
  productos: [],
  servicios: [{ servicio: datos.manicure._id }],
  ...extra,
});

describe("ventas", () => {
  it("usa los precios de la base de datos, no los que envía el navegador", async () => {
    const stockAntes = await stockDe(datos.esmalte._id);
    const res = await post(
      "/api/ventas",
      "recepcion",
      ventaBase({
        productos: [{ producto: datos.esmalte._id, cantidad: 2, precio: 1 }],
        servicios: [{ servicio: datos.manicure._id, precio: 1, precioFinal: 1 }],
      }),
    );
    expect(res.status).toBe(201);
    expect(res.body.venta.total).toBe(2 * datos.esmalte.precio + datos.manicure.precio);
    expect(await stockDe(datos.esmalte._id)).toBe(stockAntes - 2);
  });

  it("rechaza cantidades negativas sin tocar el stock", async () => {
    const stockAntes = await stockDe(datos.esmalte._id);
    const res = await post(
      "/api/ventas",
      "recepcion",
      ventaBase({ productos: [{ producto: datos.esmalte._id, cantidad: -5 }] }),
    );
    expect(res.status).toBe(400);
    expect(await stockDe(datos.esmalte._id)).toBe(stockAntes);
  });

  it("si un producto no tiene stock, no descuenta el de los demás", async () => {
    const esmalteAntes = await stockDe(datos.esmalte._id);
    const res = await post(
      "/api/ventas",
      "recepcion",
      ventaBase({
        productos: [
          { producto: datos.esmalte._id, cantidad: 1 },
          { producto: datos.lima._id, cantidad: 100000 },
        ],
      }),
    );
    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/Stock insuficiente|cantidad/);
    expect(await stockDe(datos.esmalte._id)).toBe(esmalteAntes);
  });

  it("agrupa productos repetidos en una sola línea", async () => {
    const res = await post(
      "/api/ventas",
      "recepcion",
      ventaBase({
        productos: [
          { producto: datos.lima._id, cantidad: 1 },
          { producto: datos.lima._id, cantidad: 2 },
        ],
      }),
    );
    expect(res.status).toBe(201);
    expect(res.body.venta.productos).toHaveLength(1);
    expect(res.body.venta.productos[0].cantidad).toBe(3);
  });

  it("aplica el descuento promocional del servicio una sola vez", async () => {
    const res = await post("/api/ventas", "recepcion", ventaBase({ servicios: [{ servicio: datos.pedicure._id }] }));
    expect(res.status).toBe(201);
    expect(res.body.venta.servicios[0].precioFinal).toBe(datos.pedicure.precio * 0.85);
    expect(res.body.venta.total).toBe(datos.pedicure.precio * 0.85);
  });

  it("sin aplicarDescuentos no se pueden dar descuentos manuales", async () => {
    const res = await post("/api/ventas", "empleado", ventaBase({ descuentos: [{ tipo: "global", valor: 50 }] }));
    expect(res.status).toBe(403);
  });

  it("rechaza descuentos de más del 100 % o negativos", async () => {
    expect(
      (await post("/api/ventas", "recepcion", ventaBase({ descuentos: [{ tipo: "global", valor: 150 }] }))).status,
    ).toBe(400);
    expect(
      (
        await post(
          "/api/ventas",
          "recepcion",
          ventaBase({ descuentos: [{ tipo: "global", valor: -10, esPorcentaje: false }] }),
        )
      ).status,
    ).toBe(400);
  });

  it("un descuento fijo nunca deja el total negativo", async () => {
    const res = await post(
      "/api/ventas",
      "recepcion",
      ventaBase({ descuentos: [{ tipo: "global", valor: 99999999, esPorcentaje: false }] }),
    );
    expect(res.status).toBe(201);
    expect(res.body.venta.total).toBe(0);
  });

  it("una venta finalizada no se modifica y finalizarla otra vez no falla", async () => {
    const creada = await post("/api/ventas", "recepcion", ventaBase({ estado: true }));
    const id = creada.body.venta._id;
    expect((await put(`/api/ventas/${id}`, "admin", ventaBase())).status).toBe(400);
    expect(
      (
        await put(`/api/ventas/${id}/agregar-productos`, "admin", {
          productos: [{ producto: datos.lima._id, cantidad: 1 }],
        })
      ).status,
    ).toBe(400);
    expect((await put(`/api/ventas/${id}/finalizar`, "admin", {})).status).toBe(200);
  });

  it("al eliminar una venta se devuelve el stock", async () => {
    const creada = await post(
      "/api/ventas",
      "recepcion",
      ventaBase({ productos: [{ producto: datos.lima._id, cantidad: 4 }] }),
    );
    const stockConVenta = await stockDe(datos.lima._id);
    const res = await request(app).delete(`/api/ventas/${creada.body.venta._id}`).set(como("admin"));
    expect(res.status).toBe(200);
    expect(await stockDe(datos.lima._id)).toBe(stockConVenta + 4);
  });

  it("al editar una venta pendiente el stock se ajusta a la diferencia", async () => {
    const stockInicial = await stockDe(datos.lima._id);
    const creada = await post(
      "/api/ventas",
      "recepcion",
      ventaBase({ productos: [{ producto: datos.lima._id, cantidad: 5 }] }),
    );
    await put(
      `/api/ventas/${creada.body.venta._id}`,
      "recepcion",
      ventaBase({ productos: [{ producto: datos.lima._id, cantidad: 2 }] }),
    );
    expect(await stockDe(datos.lima._id)).toBe(stockInicial - 2);
  });
});

describe("citas", () => {
  const nuevaCita = (quien, extra = {}) =>
    post("/api/citas", quien, {
      nombreempleado: datos.empleado2._id,
      nombrecliente: datos.cliente2._id,
      fechacita: fecha(20),
      horacita: "10:00",
      servicios: [{ _id: datos.manicure._id }],
      ...extra,
    });

  it("calcula precio y duración en el servidor", async () => {
    const res = await nuevaCita("recepcion", { montototal: 1, duracionTotal: 1 });
    expect(res.status).toBe(201);
    expect(res.body.cita.montototal).toBe(datos.manicure.precio);
    expect(res.body.cita.duracionTotal).toBe(datos.manicure.tiempo);
    datos.citaReservada = res.body.cita;
  });

  it("no permite dos citas del mismo empleado que se crucen", async () => {
    const res = await nuevaCita("recepcion", { horacita: "10:30" });
    expect(res.status).toBe(409);
  });

  it("la disponibilidad excluye las horas ocupadas y las que ya pasaron", async () => {
    const disponibles = async (dia) =>
      (
        await post("/api/citas/verificar-disponibilidad", "cliente", {
          nombreempleado: datos.empleado2._id,
          fecha: dia,
          servicios: [datos.manicure._id],
        })
      ).body.horariosDisponibles.map((h) => h.hora);

    const futuras = await disponibles(fecha(20));
    expect(futuras).not.toContain("10:00"); // reservada en la prueba anterior (45 min)
    expect(futuras).not.toContain("09:30"); // terminaría a las 10:15, dentro de la otra cita
    expect(futuras).toContain("11:00");

    const ayer = await disponibles(fecha(-1));
    expect(ayer).toEqual([]);
  });

  it("otro empleado sí puede tener cita a esa hora", async () => {
    expect((await nuevaCita("recepcion", { nombreempleado: datos.empleado1._id })).status).toBe(201);
  });

  it("una cita cancelada libera el horario", async () => {
    await put(`/api/citas/${datos.citaReservada._id}/cancelar`, "recepcion", { motivo: "El cliente no puede" });
    expect((await nuevaCita("recepcion", { horacita: "10:15" })).status).toBe(201);
  });

  it("un cliente no puede agendar fuera de horario ni en el pasado", async () => {
    expect((await nuevaCita("cliente", { horacita: "17:45" })).status).toBe(400);
    expect((await nuevaCita("cliente", { horacita: "07:00" })).status).toBe(400);
    expect((await nuevaCita("cliente", { fechacita: fecha(-3) })).status).toBe(400);
  });

  it("reprogramar la hora se guarda y valida choques", async () => {
    const a = await nuevaCita("recepcion", { fechacita: fecha(21), horacita: "11:00" });
    const b = await nuevaCita("recepcion", { fechacita: fecha(21), horacita: "13:00" });
    const movida = await put(`/api/citas/${b.body.cita._id}`, "recepcion", { horacita: "15:00" });
    expect(movida.status).toBe(200);
    expect(movida.body.cita.horacita).toBe("15:00");
    expect((await put(`/api/citas/${b.body.cita._id}`, "recepcion", { horacita: "11:15" })).status).toBe(409);
    expect(a.status).toBe(201);
  });

  it("una cita completada no vuelve a pendiente", async () => {
    const completada = await Cita.findOne({ estadocita: "Completada" });
    const res = await put(`/api/citas/${completada._id}`, "admin", { estadocita: "Pendiente" });
    expect(res.status).toBe(400);
  });

  it("los horarios ocupados no incluyen datos de los clientes", async () => {
    const res = await request(app)
      .get(`/api/citas/ocupados?desde=${fecha(0)}`)
      .set(como("cliente"));
    expect(res.status).toBe(200);
    expect(res.body.citas.length).toBeGreaterThan(0);
    expect(res.body.citas.every((c) => c.nombrecliente === undefined)).toBe(true);
  });
});

describe("fichas de cliente y empleado", () => {
  it("no se puede borrar un cliente con historial", async () => {
    const res = await request(app).delete(`/api/clientes/${datos.cliente1._id}`).set(como("admin"));
    expect(res.status).toBe(409);
    expect(await Cliente.exists({ _id: datos.cliente1._id })).toBeTruthy();
  });

  it("al pasar de cliente a empleado el historial se conserva", async () => {
    const rolEmpleado = await Rol.findOne({ nombreRol: "Empleado" });
    const res = await put(`/api/usuarios/${usuarios.cliente2}/update-rol`, "admin", { rol: rolEmpleado._id });
    expect(res.status).toBe(200);

    const fichaCliente = await Cliente.findById(datos.cliente2._id);
    expect(fichaCliente).not.toBeNull();
    expect(fichaCliente.estadocliente).toBe(false);
    expect(await Empleado.exists({ usuario: usuarios.cliente2 })).toBeTruthy();
  });
});

describe("sesiones y perfil", () => {
  it("cambiar la contraseña cierra las sesiones anteriores", async () => {
    const tokenViejo = tokens.inventario;
    const res = await request(app)
      .put(`/api/usuarios/${usuarios.inventario}`)
      .set(como("inventario"))
      .send({ password: "NuevaClave123!", confirmPassword: "NuevaClave123!" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();

    await new Promise((r) => setTimeout(r, 1100)); // el token viejo y el cambio no caen en el mismo segundo
    const conViejo = await request(app)
      .get("/api/productos")
      .set({ Authorization: `Bearer ${tokenViejo}` });
    expect(conViejo.status).toBe(401);
    const conNuevo = await request(app)
      .get("/api/productos")
      .set({ Authorization: `Bearer ${res.body.token}` });
    expect(conNuevo.status).toBe(200);
  });

  it("cambiar el propio correo mantiene el acceso a las citas propias", async () => {
    const res = await put(`/api/usuarios/${usuarios.cliente}`, "cliente", { email: "sofia.nueva@nailsoft.local" });
    expect(res.status).toBe(200);
    expect((await Cliente.findById(datos.cliente1._id)).correocliente).toBe("sofia.nueva@nailsoft.local");

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "sofia.nueva@nailsoft.local", password: PASSWORD });
    const citas = await request(app)
      .get("/api/citas")
      .set({ Authorization: `Bearer ${login.body.token}` });
    expect(citas.body.citas.length).toBe(await Cita.countDocuments({ nombrecliente: datos.cliente1._id }));
  });

  it("no se puede tomar el correo de otro usuario", async () => {
    const res = await put(`/api/usuarios/${usuarios.cliente}`, "cliente", { email: "admin@nailsoft.local" });
    expect(res.status).toBe(400);
    expect((await Usuario.findById(usuarios.cliente)).email).toBe("sofia.nueva@nailsoft.local");
  });
});

describe("ventas en datos", () => {
  it("todas las ventas tienen el total igual a sus líneas menos descuentos", async () => {
    for (const venta of await Venta.find()) {
      const bruto =
        venta.productos.reduce((t, p) => t + p.subtotal, 0) + venta.servicios.reduce((t, s) => t + s.precio, 0);
      expect(venta.total).toBeCloseTo(Math.max(0, bruto - venta.descuentoTotal), 2);
    }
  });
});
