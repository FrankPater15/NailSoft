const { Router } = require("express")
const { validarJWT } = require("../middlewares/verificartoken")
const verificarPermisos = require("../middlewares/verificarPermisos")
const {
  usuariosGet,
  usuarioGetById,
  usuariosPost,
  usuariosPut,
  usuariosUpdateRol,
  usuariosDelete,
  PromGet,
  usuariosToggleEstado,
} = require("../controllers/usuario")

const router = Router()

// validarJWT ya rechaza usuarios inactivos y roles desactivados
router.use(validarJWT)

router.get("/", verificarPermisos(["verUsuarios"]), usuariosGet)
router.get("/buscar/prom", verificarPermisos(["verUsuarios"]), PromGet)
// Cada usuario puede ver y editar sus propios datos; el controlador revisa el permiso para los demás
router.get("/:id", usuarioGetById)
router.post("/", verificarPermisos(["crearUsuarios"]), usuariosPost)
router.put("/:id", usuariosPut)
router.put("/:id/update-rol", verificarPermisos(["actualizarUsuarios"]), usuariosUpdateRol)
router.patch("/:id/toggle-estado", verificarPermisos(["actualizarUsuarios"]), usuariosToggleEstado)
router.delete("/:id", verificarPermisos(["eliminarUsuarios"]), usuariosDelete)

module.exports = router
