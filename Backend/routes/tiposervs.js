// Tipos de descuento (modelo TipoServ), expuestos en /api/tiposervicios
const { Router } = require("express")
const { validarJWT } = require("../middlewares/verificartoken")
const verificarPermisos = require("../middlewares/verificarPermisos")
const {
  tiposerviciosGet,
  tiposerviciosPost,
  tiposerviciosPut,
  tiposerviciosDelete,
  tiposerviciosToggleEstado,
} = require("../controllers/tiposerv")

const router = Router()

router.use(validarJWT)

// Cualquier usuario autenticado puede consultarlos: el catálogo muestra las promociones
router.get("/", tiposerviciosGet)
router.post("/", verificarPermisos(["crearTipoDescuento"]), tiposerviciosPost)
router.put("/:id", verificarPermisos(["actualizarTipoDescuento"]), tiposerviciosPut)
router.delete("/:id", verificarPermisos(["eliminarTipoDescuento"]), tiposerviciosDelete)
router.patch("/:id/toggle-estado", verificarPermisos(["actualizarTipoDescuento"]), tiposerviciosToggleEstado)

module.exports = router
