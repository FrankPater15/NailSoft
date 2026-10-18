const { Router } = require("express");
const { productosGet, productosPost, productosPut, productosDelete } = require("../controllers/productos");
const { validarJWT } = require("../middlewares/verificartoken");
const verificarPermisos = require("../middlewares/verificarPermisos");
const { subirImagen } = require("../middlewares/subirImagen");

const router = Router();

router.use(validarJWT);

router.get("/", verificarPermisos(["verProducto"]), productosGet);
router.post("/", verificarPermisos(["crearProducto"]), subirImagen("imagen"), productosPost);
router.put("/:id", verificarPermisos(["actualizarProducto"]), subirImagen("imagen"), productosPut);
router.delete("/:id", verificarPermisos(["eliminarProducto"]), productosDelete);

module.exports = router;
