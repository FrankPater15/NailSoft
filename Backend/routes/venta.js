const { Router } = require("express");
const { validarJWT } = require("../middlewares/verificartoken");
const verificarPermisos = require("../middlewares/verificarPermisos");
const { cargarPersona } = require("../middlewares/cargarPersona");
const { alcanceVentas, exigirEnAlcance } = require("../middlewares/alcance");
const Venta = require("../modules/venta");
const {
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
} = require("../controllers/venta");

const router = Router();

router.use(validarJWT, cargarPersona);

// Los permisos "...Propias" limitan la acción a las ventas del propio cliente o empleado
const ver = verificarPermisos(["verVentas", "verVentasPropias"]);
const actualizar = [
  verificarPermisos(["actualizarVentas", "actualizarVentasPropias"]),
  exigirEnAlcance(Venta, alcanceVentas, "actualizarVentas"),
];

router.get("/", ver, obtenerVentas);
router.get("/cliente", ver, obtenerVentasPorCliente);
router.get("/cita/:citaId", ver, obtenerVentasPorCita);
router.get("/:id", ver, exigirEnAlcance(Venta, alcanceVentas, "verVentas"), obtenerVentaPorId);
router.post("/", verificarPermisos(["crearVentas"]), crearVenta);
router.put("/:id", actualizar, actualizarVenta);
router.delete("/:id", verificarPermisos(["eliminarVentas"]), eliminarVenta);
router.put("/:id/finalizar", actualizar, finalizarVenta);
router.put("/:id/agregar-productos", actualizar, agregarProductosVenta);
router.put("/:id/agregar-servicios", actualizar, agregarServiciosVenta);

module.exports = router;
