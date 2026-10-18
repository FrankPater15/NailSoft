const { Router } = require('express');
const { validarJWT } = require('../middlewares/verificartoken');
const verificarPermisos = require('../middlewares/verificarPermisos');
const { detserviciosGet, detserviciosPost } = require('../controllers/detalleservicio');

const router = Router();

router.use(validarJWT);

router.get('/', verificarPermisos(['verServicios']), detserviciosGet);
router.post('/', verificarPermisos(['crearServicios']), detserviciosPost);

module.exports = router;
