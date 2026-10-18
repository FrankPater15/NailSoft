const { Router } = require('express');
const { validarJWT } = require('../middlewares/verificartoken');
const verificarPermisos = require('../middlewares/verificarPermisos');
const { cargarPersona } = require('../middlewares/cargarPersona');
const { crearCita, obtenerCitas, obtenerCitaPorId, actualizarCita, cancelarCita, eliminarCita, verificarDisponibilidad, iniciarCita, obtenerCitasPorCliente, obtenerHorariosOcupados } = require('../controllers/cita');

const router = Router();

router.use(validarJWT, cargarPersona);

// Los permisos "...Propias" limitan la acción a las citas del propio cliente o empleado
const ver = verificarPermisos(['verCitas', 'verCitasPropias']);
const crear = verificarPermisos(['crearCitas', 'crearCitasPropias']);
const actualizar = verificarPermisos(['actualizarCitas', 'actualizarCitasPropias']);
const cancelar = verificarPermisos(['actualizarCitas', 'actualizarCitasPropias', 'cancelarCitasPropias']);

router.post('/', crear, crearCita);
router.get('/', ver, obtenerCitas);
router.get('/cliente', ver, obtenerCitasPorCliente);
const agendar = verificarPermisos(['crearCitas', 'crearCitasPropias', 'actualizarCitas', 'actualizarCitasPropias']);
router.post('/verificar-disponibilidad', agendar, verificarDisponibilidad);
router.get('/ocupados', agendar, obtenerHorariosOcupados);
router.get('/:id', ver, obtenerCitaPorId);
router.put('/:id', actualizar, actualizarCita);
router.delete('/:id', verificarPermisos(['eliminarCitas']), eliminarCita);
router.put('/:id/iniciar', actualizar, iniciarCita);
router.put('/:id/cancelar', cancelar, cancelarCita);

module.exports = router;
