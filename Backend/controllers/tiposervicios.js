const { response } = require("express");
const TiposervicioTs = require("../modules/tiposervicios.js");
const { tipoServicioSchema, tipoServicioUpdateSchema } = require("../validators/tiposervicio.validator.js");
const { responderError } = require("../utils/errores");

// Obtener todos los tipos de servicios
const tiposerviciostsGet = async (req, res = response) => {
  // Obtener todos los tipos de servicios
  try {
    const tiposerviciosts = await TiposervicioTs.find(); // Consultar todos los documentos de la colección
    // Si no hay tipos de servicios en la base de datos

    // Devolvemos los tipos de servicios obtenidos
    res.json({
      tiposerviciosts,
    });
  } catch (error) {
    responderError(res, error, "Error al obtener los tipos de servicios");
  }
};
// Crear un nuevo tipo de servicio

// Crear una categoría de servicio
const tiposerviciostsPost = async (req, res = response) => {
  try {
    const { error, value } = tipoServicioSchema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        msg: "Error en la validación de los datos",
        error: error.details.map((err) => err.message),
      });
    }
    const { nombreTipoServicio, activo } = value; // Extraer datos del cuerpo de la solicitud

    const tiposerviciots = new TiposervicioTs({ nombreTipoServicio, activo });
    // Guardar el nuevo tipo de servicio en la base de datos
    await tiposerviciots.save();

    res.status(201).json({
      msg: "Tipo servicio creado correctamente",
      tiposerviciots,
    });
  } catch (error) {
    responderError(res, error, "Error al crear el tipo de servicio");
  }
};

// Actualizar un tipo de servicio
const tiposerviciostsPut = async (req, res = response) => {
  const { id } = req.params;
  try {
    const { error, value } = tipoServicioUpdateSchema.validate(req.body, { abortEarly: false });

    if (error) {
      return res.status(400).json({
        msg: "Error en la validación de los datos",
        error: error.details.map((err) => err.message),
      });
    }
    const { nombreTipoServicio, activo } = value; // Extraer datos del cuerpo de la solicitud

    const tiposerviciots = await TiposervicioTs.findByIdAndUpdate(id, { nombreTipoServicio, activo }, { new: true });

    if (!tiposerviciots) {
      return res.status(404).json({
        msg: "Tipo de servicio no encontrado",
      });
    }

    if (value.nombreTipoServicio !== undefined) {
      tiposerviciots.nombreTipoServicio = value.nombreTipoServicio;
    }
    if (value.activo !== undefined) {
      tiposerviciots.activo = value.activo;
    }
    await tiposerviciots.save();

    res.json({
      msg: "Tipo de servicio actualizado correctamente",
      tiposerviciots,
    });
  } catch (error) {
    responderError(res, error, "Error al actualizar el tipo de servicio");
  }

  //     // Actualizar el tipo de servicio
  //     tiposerviciots.nombreTipoServicio = nombreTipoServicio
  //     tiposerviciots.activo = activo
};

// Eliminar un tipo de servicio
const tiposerviciostsDelete = async (req, res = response) => {
  const { id } = req.params;

  try {
    // Verificar si el tipo de servicio existe
    const tiposerviciots = await TiposervicioTs.findById(id);
    if (!tiposerviciots) {
      return res.status(404).json({
        msg: "Tipo de servicio no encontrado",
      });
    }

    // Eliminar el tipo de servicio de la base de datos
    await TiposervicioTs.findByIdAndDelete(id);

    res.json({
      msg: "Tipo de servicio eliminado correctamente",
    });
  } catch (error) {
    responderError(res, error, "Error al eliminar el tipo de servicio");
  }
};

//cambiar el etado del tipod e servicio
const tiposerviciostsToggleEstado = async (req, res = response) => {
  const { id } = req.params;
  try {
    const tiposerviciots = await TiposervicioTs.findById(id);

    if (!tiposerviciots) {
      return res.status(404).json({
        msg: "Tipo de servicio no encontrado",
      });
    }

    // Cambiar el estado (invertir el valor actual)
    tiposerviciots.activo = !tiposerviciots.activo;
    await tiposerviciots.save();
    res.json({
      msg: `Tipo de servicio ${tiposerviciots.activo ? "activado" : "desactivado"} correctamente`,
      tiposerviciots,
    });
  } catch (error) {
    responderError(res, error, "Error al cambiar el estado del tipo de servicio");
  }
};

module.exports = {
  tiposerviciostsGet,
  tiposerviciostsPost,
  tiposerviciostsPut,
  tiposerviciostsDelete,
  tiposerviciostsToggleEstado,
};
