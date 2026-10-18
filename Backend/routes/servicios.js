const { Router } = require("express");
const {
  serviciosGet,
  serviciosPost,
  serviciosPut,
  serviciosDelete,
  serviciosExportExcel,
  serviciosToggleEstado,
  validarNombreServicio,
} = require("../controllers/servicio");
const { validarJWT } = require("../middlewares/verificartoken");
const verificarPermisos = require("../middlewares/verificarPermisos");
const { subirImagen } = require("../middlewares/subirImagen");

const router = Router();

router.use(validarJWT);

router.get("/", verificarPermisos(["verServicios"]), serviciosGet);
router.get("/validar-nombre", verificarPermisos(["verServicios"]), validarNombreServicio);
router.get("/export-excel", verificarPermisos(["verServicios"]), serviciosExportExcel);
router.post("/", verificarPermisos(["crearServicios"]), subirImagen("imagen"), serviciosPost);
router.put("/:id", verificarPermisos(["actualizarServicios"]), subirImagen("imagen"), serviciosPut);
router.delete("/:id", verificarPermisos(["eliminarServicios"]), serviciosDelete);
router.patch("/:id/toggle-estado", verificarPermisos(["actualizarServicios"]), serviciosToggleEstado);

module.exports = router;
