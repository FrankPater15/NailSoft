// Categorías de servicio (modelo TipoServicios), expuestas en /api/tiposervicioss
const { Router } = require('express');
const { validarJWT } = require('../middlewares/verificartoken');
const verificarPermisos = require('../middlewares/verificarPermisos');
const {
    tiposerviciostsGet,
    tiposerviciostsPost,
    tiposerviciostsPut,
    tiposerviciostsDelete,
    tiposerviciostsToggleEstado
} = require('../controllers/tiposervicios');

const router = Router();

router.use(validarJWT);

// Cualquier usuario autenticado puede consultarlas: el catálogo agrupa por categoría
router.get('/', tiposerviciostsGet);
router.post('/', verificarPermisos(['crearTipoServicios']), tiposerviciostsPost);
router.put('/:id', verificarPermisos(['actualizarTipoServicios']), tiposerviciostsPut);
router.delete('/:id', verificarPermisos(['eliminarTipoServicios']), tiposerviciostsDelete);
router.patch('/:id/toggle-estado', verificarPermisos(['actualizarTipoServicios']), tiposerviciostsToggleEstado);

module.exports = router;
