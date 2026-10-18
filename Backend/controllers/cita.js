const Cita = require('../modules/cita');
const Cliente = require('../modules/cliente');
const { isValidObjectId } = require('mongoose');
const { tienePermiso } = require('../middlewares/verificarPermisos');
const { alcanceCitas } = require('../middlewares/alcance');
const { ErrorNegocio, responderError } = require('../utils/errores');
const {
    inicioDeCita,
    inicioDelDia,
    finDelDia,
    validarSinChoque,
    validarHorarioAtencion,
    prepararServiciosCita,
    validarEmpleadoActivo,
    horariosDisponibles,
    ESTADOS_LIBRES,
} = require('../services/agenda');

// Busca una cita solo entre las que el usuario puede tocar según `permisoTotal`
const buscarCitaEnAlcance = (req, id, permisoTotal) => {
    const filtro = alcanceCitas(req, permisoTotal);
    if (!filtro || !isValidObjectId(id)) return null;
    return Cita.findOne({ _id: id, ...filtro });
};

// Estados desde los que una cita ya no puede cambiar a otro
const ESTADOS_FINALES = ['Completada', 'Cancelada'];

const crearCita = async (req, res) => {
    try {
        let { nombreempleado, nombrecliente, fechacita, horacita, estadocita, servicios } = req.body;
        const esPersonal = tienePermiso(req, 'crearCitas');

        // Sin crearCitas, el usuario solo agenda para sí mismo como cliente
        if (!esPersonal) {
            if (!req.cliente) {
                throw new ErrorNegocio('Solo puedes agendar citas a tu nombre como cliente', 403);
            }
            nombrecliente = req.cliente._id;
            if (estadocita && !['Pendiente', 'Confirmada'].includes(estadocita)) {
                estadocita = 'Pendiente';
            }
        }
        if (estadocita && ESTADOS_FINALES.includes(estadocita)) {
            throw new ErrorNegocio('Una cita nueva no puede crearse completada ni cancelada');
        }

        await validarEmpleadoActivo(nombreempleado);
        const cliente = isValidObjectId(nombrecliente) && await Cliente.findById(nombrecliente);
        if (!cliente) throw new ErrorNegocio('Cliente no encontrado');

        // Precio y duración salen de la base de datos, no de lo que envía el navegador
        const calculado = await prepararServiciosCita(servicios);
        const inicio = inicioDeCita(fechacita, horacita);

        if (!esPersonal) {
            // El personal puede agendar fuera de horario o en el pasado (p. ej. registrar una cita ya hecha)
            if (inicio < new Date()) throw new ErrorNegocio('No puedes agendar citas en el pasado');
            validarHorarioAtencion(horacita, calculado.duracionTotal);
        }
        await validarSinChoque({ empleadoId: nombreempleado, fechacita: inicio, horacita, duracion: calculado.duracionTotal });

        const nuevaCita = await Cita.create({
            nombreempleado,
            nombrecliente,
            fechacita: inicio,
            horacita,
            estadocita: estadocita || 'Confirmada',
            ...calculado,
        });

        res.status(201).json({
            message: 'Cita creada con éxito',
            cita: nuevaCita
        });
    } catch (error) {
        responderError(res, error, 'Error al crear la cita');
    }
};

// Obtener las citas: todas con verCitas, si no solo las propias
const obtenerCitas = async (req, res) => {
    try {
        const filtro = alcanceCitas(req, 'verCitas');
        if (!filtro) return res.json({ citas: [] });
        const citas = await Cita.find(filtro)
            .populate('nombreempleado', 'nombreempleado') // Puedes incluir más campos si es necesario
            .populate('nombrecliente', 'nombrecliente') // Idem
            .populate('servicios', 'nombreServicio precio'); // Asegúrate de que los campos existan en el modelo Servicio
        res.json({ citas });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener citas', error });
    }
};

// Obtener una cita por ID
const obtenerCitaPorId = async (req, res) => {
    try {
        const { id } = req.params;
        const consulta = buscarCitaEnAlcance(req, id, 'verCitas');
        const cita = consulta && await consulta
            .populate('nombreempleado', 'nombreempleado')
            .populate('nombrecliente', 'nombrecliente')
            .populate('servicios', 'nombreServicio precio'); // Asegúrate de hacer populate para los servicios
        if (!cita) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }
        res.json({ cita });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener la cita', error });
    }
};

// Actualizar una cita por ID
const actualizarCita = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombreempleado, nombrecliente, fechacita, horacita, estadocita, servicios, horarioLiberado, motivo } = req.body;

        const cita = await buscarCitaEnAlcance(req, id, 'actualizarCitas');
        if (!cita) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        // Una cita completada o cancelada no vuelve a otro estado
        if (estadocita && estadocita !== cita.estadocita && ESTADOS_FINALES.includes(cita.estadocita)) {
            throw new ErrorNegocio(`La cita ya está ${cita.estadocita.toLowerCase()} y no puede cambiar de estado`);
        }

        // Solo con actualizarCitas se puede reasignar la cita a otro cliente o empleado
        if (tienePermiso(req, 'actualizarCitas')) {
            if (nombreempleado && String(nombreempleado) !== String(cita.nombreempleado)) {
                await validarEmpleadoActivo(nombreempleado);
                cita.nombreempleado = nombreempleado;
            }
            if (nombrecliente && String(nombrecliente) !== String(cita.nombrecliente)) {
                if (!isValidObjectId(nombrecliente) || !(await Cliente.exists({ _id: nombrecliente }))) {
                    throw new ErrorNegocio('Cliente no encontrado');
                }
                cita.nombrecliente = nombrecliente;
            }
        }

        if (servicios !== undefined) Object.assign(cita, await prepararServiciosCita(servicios));
        if (horacita !== undefined) cita.horacita = horacita;
        if (fechacita !== undefined || horacita !== undefined) {
            cita.fechacita = inicioDeCita(fechacita ?? cita.fechacita, cita.horacita);
        }
        if (estadocita !== undefined) cita.estadocita = estadocita;
        if (horarioLiberado !== undefined) cita.horarioLiberado = Boolean(horarioLiberado);
        if (cita.estadocita === 'Cancelada' && motivo) {
            cita.motivo = motivo;
            cita.fechacancelacion = cita.fechacancelacion || new Date();
        }

        // Si la cita sigue ocupando el horario y cambió de hora, día, empleado o servicios, no debe chocar
        const ocupaHorario = !ESTADOS_LIBRES.includes(cita.estadocita) && !cita.horarioLiberado;
        const cambioHorario = ['fechacita', 'horacita', 'nombreempleado', 'duracionTotal'].some((campo) => cita.isModified(campo));
        if (ocupaHorario && cambioHorario) {
            await validarSinChoque({
                empleadoId: cita.nombreempleado,
                fechacita: cita.fechacita,
                horacita: cita.horacita,
                duracion: cita.duracionTotal,
                excluirId: cita._id,
            });
        }

        await cita.save();
        await cita.populate([
            { path: 'nombreempleado', select: 'nombreempleado' },
            { path: 'nombrecliente', select: 'nombrecliente' },
        ]);

        res.json({ message: 'Cita actualizada con éxito', cita });
    } catch (error) {
        responderError(res, error, 'Error al actualizar la cita');
    }
};

const cancelarCita = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;

        // Validar que se proporcione un motivo de cancelación
        if (!motivo) {
            return res.status(400).json({ 
                message: 'Debe proporcionar un motivo de cancelación' 
            });
        }

        const existente = await buscarCitaEnAlcance(req, id, 'actualizarCitas');
        if (!existente) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }
        if (['Completada', 'Cancelada'].includes(existente.estadocita)) {
            return res.status(400).json({
                message: `No se puede cancelar una cita ${existente.estadocita.toLowerCase()}`
            });
        }

        // Buscar y actualizar la cita, incluyendo motivo y fecha de cancelación
        const cita = await Cita.findByIdAndUpdate(
            id,
            {
                estadocita: 'Cancelada',
                motivo: motivo,
                fechacancelacion: new Date() // Fecha actual automáticamente
            },
            { new: true }
        )
        .populate('nombreempleado', 'nombreempleado')
        .populate('nombrecliente', 'nombrecliente')
        .populate('servicios', 'nombreServicio precio');

        res.json({
            message: 'Cita cancelada con éxito',
            cita: {
                ...cita._doc,
                motivo: motivo,
                fechacancelacion: new Date()
            }
        });
    } catch (error) {
        console.error('Error al cancelar la cita:', error);
        res.status(500).json({ 
            message: 'Error al cancelar la cita', 
            error: error.message 
        });
    }
};
// Eliminar una cita por ID
const eliminarCita = async (req, res) => {
    try {
        const { id } = req.params;
        const cita = await Cita.findByIdAndDelete(id);
        if (!cita) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }
        res.json({ message: 'Cita eliminada con éxito', cita });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar la cita', error });
    }
};

// Verificar disponibilidad del empleado
const verificarDisponibilidad = async (req, res) => {
    try {
        const { nombreempleado, fecha, servicios } = req.body;
        if (!nombreempleado || !fecha || !Array.isArray(servicios)) {
            throw new ErrorNegocio('Se requiere nombreempleado, fecha y un array de servicios');
        }
        await validarEmpleadoActivo(nombreempleado);
        const calculado = await prepararServiciosCita(servicios);
        const libres = await horariosDisponibles({ empleadoId: nombreempleado, fecha, duracion: calculado.duracionTotal });

        res.json({
            horariosDisponibles: libres,
            duracionTotal: calculado.duracionTotal,
            servicios: calculado.servicios.map((s) => ({
                id: s.servicio,
                nombreServicio: s.nombreServicio,
                precio: s.precio,
                tiempo: s.tiempo
            }))
        });
    } catch (error) {
        responderError(res, error, 'Error al verificar disponibilidad');
    }
};

// Horarios ocupados desde una fecha (por defecto hoy), sin datos de los clientes,
// para que cualquier usuario que agenda vea qué franjas están tomadas.
// Query: desde (YYYY-MM-DD), hasta (YYYY-MM-DD, opcional), empleado (opcional)
const obtenerHorariosOcupados = async (req, res) => {
    try {
        const { desde, hasta, empleado } = req.query;
        const filtro = {
            fechacita: { $gte: inicioDelDia(desde || new Date()) },
            estadocita: { $nin: ESTADOS_LIBRES },
            horarioLiberado: { $ne: true },
        };
        if (hasta) filtro.fechacita.$lte = finDelDia(inicioDelDia(hasta));
        if (empleado) {
            if (!isValidObjectId(empleado)) throw new ErrorNegocio('Empleado no válido');
            filtro.nombreempleado = empleado;
        }
        const citas = await Cita.find(filtro)
            .select('nombreempleado fechacita horacita duracionTotal estadocita')
            .sort({ fechacita: 1 })
            .lean();
        res.json({ citas });
    } catch (error) {
        responderError(res, error, 'Error al obtener los horarios ocupados');
    }
};


// Iniciar cita (cambiar a "En Progreso")

const iniciarCita = async (req, res) => {
    try {
        const { id } = req.params;

        const consulta = buscarCitaEnAlcance(req, id, 'actualizarCitas');
        const cita = consulta && await consulta
            .populate('nombreempleado', 'nombreempleado')
            .populate('nombrecliente', 'nombrecliente apellidocliente correocliente celularcliente');

        if (!cita) {
            return res.status(404).json({ message: 'Cita no encontrada' });
        }

        if (cita.estadocita !== 'Confirmada') {
            return res.status(400).json({ message: 'La cita debe estar confirmada para iniciarla' });
        }

        // La venta se registra al finalizar la atención (ventas unificadas en /api/ventas)
        cita.estadocita = 'En Progreso';
        await cita.save();

        res.json({ message: 'Cita iniciada con éxito', cita });
    } catch (error) {
        responderError(res, error, 'Error al iniciar la cita');
    }
};

// En controllers/cita.js
const obtenerCitasPorCliente = async (req, res) => {
    try {
      // Con verCitas se puede consultar cualquier cliente; si no, solo el propio
      let clienteId = req.cliente?._id;
      if (tienePermiso(req, 'verCitas') && req.query.clienteId) {
        clienteId = req.query.clienteId;
      }
      if (!clienteId || !isValidObjectId(clienteId)) {
        return res.status(200).json([]);
      }

      const citas = await Cita.find({ nombrecliente: clienteId })
        .populate("nombreempleado")
        .populate("nombrecliente")
        .populate("servicios.servicio")
        .sort({ fechacita: 1 });

      res.status(200).json(citas);
    } catch (error) {
      console.error("Error al obtener citas del cliente:", error);
      res.status(500).json({ message: "Error al obtener las citas", error: error.message });
    }
  };

module.exports = {
    crearCita,
    cancelarCita,
    obtenerCitas,
    obtenerCitaPorId,
    actualizarCita,
    eliminarCita,
    verificarDisponibilidad,
    iniciarCita,
    obtenerCitasPorCliente,
    obtenerHorariosOcupados
};