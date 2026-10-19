const Empleado = require("../modules/empleado");
const { isValidObjectId } = require("mongoose");
const { tienePermiso } = require("../middlewares/verificarPermisos");
const { tieneHistorialEmpleado } = require("../services/personas");
const { responderError } = require("../utils/errores");

// Crear un nuevo empleado
const crearEmpleado = async (req, res) => {
  try {
    const { nombreempleado, apellidoempleado, correoempleado, telefonoempleado, estadoempleado } = req.body;

    // Validar campos obligatorios
    if (!nombreempleado || !apellidoempleado || !correoempleado || !telefonoempleado) {
      return res.status(400).json({ message: "Faltan campos obligatorios" });
    }

    // Verificar si el correo ya existe
    const existeCorreo = await Empleado.findOne({ correoempleado });
    if (existeCorreo) {
      return res.status(400).json({ message: "El correo ya está en uso" });
    }

    // Crear una nueva instancia de Empleado
    const nuevoEmpleado = new Empleado({
      nombreempleado,
      apellidoempleado,
      correoempleado,
      telefonoempleado,
      estadoempleado,
    });

    // Guardar el empleado en la base de datos
    await nuevoEmpleado.save();
    res.status(201).json({ message: "Empleado creado con éxito", empleado: nuevoEmpleado });
  } catch (error) {
    responderError(res, error, "Error al crear el empleado");
  }
};

// Sin verEmpleados solo se exponen los datos necesarios para agendar (sin correo ni teléfono)
const camposVisibles = (req) =>
  tienePermiso(req, "verEmpleados") ? undefined : "nombreempleado apellidoempleado estadoempleado";

// Obtener todos los empleados
const obtenerEmpleados = async (req, res) => {
  try {
    const campos = camposVisibles(req);
    const empleados = await Empleado.find({}, campos && `${campos} usuario`).lean();
    // esPropio marca el registro del usuario actual sin exponer el vínculo de los demás
    const respuesta = empleados.map(({ usuario, ...empleado }) => ({
      ...empleado,
      ...(campos ? {} : { usuario }),
      esPropio: Boolean(usuario) && String(usuario) === String(req.userId),
    }));
    res.status(200).json(respuesta);
  } catch (error) {
    responderError(res, error, "Error al obtener los empleados");
  }
};

// Obtener un empleado por ID
const obtenerEmpleadoPorId = async (req, res) => {
  try {
    const empleado = isValidObjectId(req.params.id) && (await Empleado.findById(req.params.id, camposVisibles(req)));
    if (!empleado) {
      return res.status(404).json({ message: "Empleado no encontrado" });
    }
    res.status(200).json(empleado);
  } catch (error) {
    responderError(res, error, "Error al obtener el empleado");
  }
};

// Actualizar un empleado
const actualizarEmpleado = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombreempleado, apellidoempleado, correoempleado, telefonoempleado, estadoempleado } = req.body;

    // Verificar si el empleado existe
    const empleadoExistente = await Empleado.findById(id);
    if (!empleadoExistente) {
      return res.status(404).json({ message: "Empleado no encontrado" });
    }

    // Verificar si el correo ya está en uso por otro empleado
    if (correoempleado && correoempleado !== empleadoExistente.correoempleado) {
      const existeCorreo = await Empleado.findOne({ correoempleado });
      if (existeCorreo) {
        return res.status(400).json({ message: "El correo ya está en uso" });
      }
    }

    const empleadoActualizado = await Empleado.findByIdAndUpdate(
      id,
      { nombreempleado, apellidoempleado, correoempleado, telefonoempleado, estadoempleado },
      { new: true },
    );

    res.status(200).json({ message: "Empleado actualizado con éxito", empleado: empleadoActualizado });
  } catch (error) {
    responderError(res, error, "Error al actualizar el empleado");
  }
};

// Eliminar un empleado
const eliminarEmpleado = async (req, res) => {
  try {
    const { id } = req.params;
    if (isValidObjectId(id) && (await tieneHistorialEmpleado(id))) {
      return res.status(409).json({
        message: "El empleado tiene citas o ventas registradas. Desactívalo en lugar de eliminarlo.",
      });
    }
    const empleadoEliminado = isValidObjectId(id) && (await Empleado.findByIdAndDelete(id));
    if (!empleadoEliminado) {
      return res.status(404).json({ message: "Empleado no encontrado" });
    }
    res.status(200).json({ message: "Empleado eliminado con éxito" });
  } catch (error) {
    responderError(res, error, "Error al eliminar el empleado");
  }
};

// Cambiar estado de un empleado
const cambiarEstadoEmpleado = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el empleado existe
    const empleado = await Empleado.findById(id);
    if (!empleado) {
      return res.status(404).json({ message: "Empleado no encontrado" });
    }

    // Cambiar el estado (toggle)
    const nuevoEstado = !empleado.estadoempleado;

    const empleadoActualizado = await Empleado.findByIdAndUpdate(id, { estadoempleado: nuevoEstado }, { new: true });

    res.status(200).json({
      message: `Empleado ${nuevoEstado ? "activado" : "desactivado"} con éxito`,
      empleado: empleadoActualizado,
    });
  } catch (error) {
    responderError(res, error, "Error al cambiar el estado del empleado");
  }
};

// Modificar el exports para incluir la nueva función
module.exports = {
  crearEmpleado,
  obtenerEmpleados,
  obtenerEmpleadoPorId,
  actualizarEmpleado,
  eliminarEmpleado,
  cambiarEstadoEmpleado,
};
