const { Router } = require('express');
const { validarJWT } = require('../middlewares/verificartoken');
const verificarPermisos = require('../middlewares/verificarPermisos');
const {
    obtenerInsumos,
    crearInsumo,
    actualizarInsumo,
    eliminarInsumo,
    cambiarEstadoInsumo,
    darDeBajaInsumo,
    verificarInsumoExistente,
    incrementarStockInsumo
} = require('../controllers/insumo');

const router = Router();

router.use(validarJWT);

router.get('/', verificarPermisos(['verInsumos']), obtenerInsumos);
router.get('/verificar/:nombre', verificarPermisos(['verInsumos']), verificarInsumoExistente);
router.post('/', verificarPermisos(['crearInsumos']), crearInsumo);
router.post('/dar-de-baja', verificarPermisos(['crearBajaProducto']), darDeBajaInsumo);
router.put('/incrementar-stock/:id', verificarPermisos(['actualizarInsumos', 'crearCompras']), incrementarStockInsumo);
router.put('/:id', verificarPermisos(['actualizarInsumos']), actualizarInsumo);
router.patch('/:id/estado', verificarPermisos(['actualizarInsumos']), cambiarEstadoInsumo);
router.delete('/:id', verificarPermisos(['eliminarInsumos']), eliminarInsumo);

module.exports = router;
