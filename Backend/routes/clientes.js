const express = require("express");
const { validarJWT } = require("../middlewares/verificartoken");
const verificarPermisos = require("../middlewares/verificarPermisos");
const { cargarPersona } = require("../middlewares/cargarPersona");
const {
  crearCliente,
  obtenerClientes,
  obtenerClientePorId,
  obtenerPerfilCliente,
  actualizarCliente,
  eliminarCliente,
  cambiarEstadoCliente,
} = require("../controllers/cliente");

const router = express.Router();

router.use(validarJWT, cargarPersona);

// Sin el permiso verCliente / actualizarCliente, cada cliente solo ve y edita su propio registro
router.get("/perfil", obtenerPerfilCliente);
router.get("/", obtenerClientes);
router.get("/:id", obtenerClientePorId);
router.post("/", verificarPermisos(["crearCliente"]), crearCliente);
router.put("/:id", actualizarCliente);
router.delete("/:id", verificarPermisos(["eliminarCliente"]), eliminarCliente);
router.patch("/:id/toggle-estado", verificarPermisos(["actualizarCliente"]), cambiarEstadoCliente);

module.exports = router;
