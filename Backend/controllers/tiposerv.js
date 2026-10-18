const { response } = require("express");
const Tiposervicio = require("../modules/tiposerv.js");
const { tipoDescuentoSchema, tipoDescuentoUpdateSchema } = require("../validators/tipodescuento.validator.js");
const { responderError } = require("../utils/errores");
// Obtener todos los descuentos
const tiposerviciosGet = async (req, res = response) => {
  try {
    const tiposervicios = await Tiposervicio.find(); // Consultar todos los documentos de la colección

    // Si no hay descuentos en la base de datos

    // Devolvemos los descuetos obtenidos
    res.json({
      tiposervicios,
    });
  } catch (error) {
    responderError(res, error, "Error al obtener los tipos de descuentos");
  }
};

// Crear un nuevo descuento
const tiposerviciosPost = async (req, res = response) => {
  const { error, value } = tipoDescuentoSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      msg: "Error en la validación de los datos",
      errors: error.details.map((err) => err.message),
    });
  }

  const { nombreTs, activo, descuento = 0, esPromocional = false } = value; // Extraer datos del cuerpo de la solicitud

  const tiposervicio = new Tiposervicio({ nombreTs, activo, descuento, esPromocional });
  try {
    await tiposervicio.save(); // Guardar el nuevo tipo de servicio en la base de datos
    res.status(201).json({
      msg: "Tipo de servicio creado correctamente",
      tiposervicio,
    });
  } catch (err) {
    responderError(res, err, "Error al crear el tipo de servicio");
  }
};

// Actualizar un tipo de servicio
const tiposerviciosPut = async (req, res = response) => {
  const { id } = req.params;

  const { error, value } = tipoDescuentoUpdateSchema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      msg: "Error en la validación de los datos",
      errors: error.details.map((err) => err.message),
    });
  }

  try {
    const tiposervicio = await Tiposervicio.findByIdAndUpdate(id);

    if (!tiposervicio) {
      return res.status(404).json({
        msg: "Tipo de servicio no encontrado",
      });
    }

    if (value.nombreTs !== undefined) tiposervicio.nombreTs = value.nombreTs;
    if (value.activo !== undefined) tiposervicio.activo = value.activo;
    if (value.descuento !== undefined) tiposervicio.descuento = value.descuento;
    if (value.esPromocional !== undefined) tiposervicio.esPromocional = value.esPromocional;
    // Guardar los cambios
    await tiposervicio.save();
    res.json({
      msg: "Tipo de servicio actualizado correctamente",
      tiposervicio,
    });
  } catch (err) {
    responderError(res, err, "Error al actualizar el tipo de servicio");
  }
};

// Eliminar un tipo de servicio
const tiposerviciosDelete = async (req, res = response) => {
  const { id } = req.params;

  try {
    const tiposervicio = await Tiposervicio.findByIdAndDelete(id);

    if (!tiposervicio) {
      return res.status(404).json({
        msg: "Tipo de servicio no encontrado",
      });
    }

    res.json({
      msg: "Tipo de servicio eliminado correctamente",
    });
  } catch (error) {
    responderError(res, error, "Error al eliminar el tipo de servicio");
  }
};

// Cambiar el estado de un tipo de servicio (activar/desactivar)
const tiposerviciosToggleEstado = async (req, res = response) => {
  const { id } = req.params;

  try {
    const tiposervicio = await Tiposervicio.findById(id);

    if (!tiposervicio) {
      return res.status(404).json({
        msg: "Tipo de servicio no encontrado",
      });
    }

    // Cambiar el estado (invertir el valor actual)
    tiposervicio.activo = !tiposervicio.activo;

    await tiposervicio.save();

    res.json({
      msg: `Tipo de servicio ${tiposervicio.activo ? "activado" : "desactivado"} correctamente`,
      tiposervicio,
    });
  } catch (error) {
    responderError(res, error, "Error al cambiar el estado del tipo de servicio");
  }
};

module.exports = {
  tiposerviciosGet,
  tiposerviciosPost,
  tiposerviciosPut,
  tiposerviciosDelete,
  tiposerviciosToggleEstado,
};
