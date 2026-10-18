const { Router } = require("express");
const { validarJWT } = require("../middlewares/verificartoken");
const verificarPermisos = require("../middlewares/verificarPermisos");
const {
  crearEmpleado,
  obtenerEmpleados,
  obtenerEmpleadoPorId,
  actualizarEmpleado,
  eliminarEmpleado,
  cambiarEstadoEmpleado,
} = require("../controllers/empleado");

const router = Router();

router.use(validarJWT);

// Cualquier usuario autenticado puede listar empleados (para agendar citas),
// pero sin verEmpleados solo recibe los datos públicos
router.get("/", obtenerEmpleados);
router.get("/:id", obtenerEmpleadoPorId);
router.post("/", verificarPermisos(["crearEmpleados"]), crearEmpleado);
router.put("/:id", verificarPermisos(["actualizarEmpleados"]), actualizarEmpleado);
router.delete("/:id", verificarPermisos(["eliminarEmpleados"]), eliminarEmpleado);
router.patch("/:id/toggle-estado", verificarPermisos(["actualizarEmpleados"]), cambiarEstadoEmpleado);

module.exports = router;
