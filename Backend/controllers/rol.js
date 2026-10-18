const { response } = require("express");
const Rol = require("../modules/rol"); // Importar el modelo de Rol
const Permiso = require("../modules/permiso"); // Importar el modelo de Permiso
const ExcelJS = require("exceljs"); // Importar ExcelJS para generar archivos Excel
const { rolSchema } = require("../validators/rol.validator");
const { responderError } = require("../utils/errores");
const Usuario = require("../modules/usuario");
const { isValidObjectId } = require("mongoose");

// Método GET para obtener los roles
const rolesGet = async (req, res = response) => {
  try {
    const roles = await Rol.find().populate("permisoRol"); // Populate para mostrar detalles de permisos

    res.json({ roles });
  } catch (error) {
    responderError(res, error, "Error al obtener los roles");
  }
};

// Método POST para crear un nuevo rol
const rolesPost = async (req, res = response) => {
  const { error, value } = rolSchema.validate(req.body, { abortEarly: false }); // Validar los datos de entrada

  if (error) {
    return res.status(400).json({
      msg: error.details.map((err) => err.message),
    });
  }
  const { nombreRol, permisoRol, estadoRol } = value;

  const permisoArray = Array.isArray(permisoRol) ? permisoRol : [permisoRol]; // Asegúrate de que permisoRol sea un arreglo

  try {
    const permisosExistentes = await Permiso.find({ _id: { $in: permisoArray } });
    if (permisosExistentes.length !== permisoArray.length) {
      return res.status(400).json({
        msg: "Uno o más permisos no existen.",
      });
    }

    const isAdmin = nombreRol.toLowerCase() === "admin"; // Compara con "admin" en minúsculas

    const rol = new Rol({
      nombreRol,
      permisoRol: permisoArray,
      estadoRol,
      esAdmin: isAdmin,
    });
    await rol.save();
    res.status(201).json({
      msg: "Rol creado exitosamente",
      rol,
    });
  } catch (error) {
    console.error(error);
    if (error.code === 11000) {
      return res.status(400).json({
        msg: "Ya existe un rol con ese nombre",
      });
    }
    res.status(500).json({
      msg: "Error al crear el rol",
    });
  }
};

// Método PUT para actualizar un rol por su id
const rolesPut = async (req, res = response) => {
  const { id } = req.params;
  const schemaPut = rolSchema.fork(["nombreRol", "permisoRol", "estadoRol"], (field) => field.optional());

  const { error, value } = schemaPut.validate(req.body, { abortEarly: false }); // Validar los datos de entrada
  if (error) {
    return res.status(400).json({
      msg: error.details.map((e) => e.message).join(", "),
    });
  }

  try {
    const rolExistente = await Rol.findById(id);
    if (!rolExistente) {
      return res.status(404).json({
        msg: "Rol no encontrado",
      });
    }

    const { nombreRol, permisoRol, estadoRol } = value; // Extraer los valores validados

    if (nombreRol) {
      rolExistente.nombreRol = nombreRol;
      rolExistente.esAdmin = nombreRol.toLowerCase() === "admin"; // Actualizar esAdmin
    }

    if (permisoRol) {
      const permisosArray = Array.isArray(permisoRol) ? permisoRol : [permisoRol]; // Asegúrate de que permisoRol sea un arreglo
      const permisosExistentes = await Permiso.find({ _id: { $in: permisosArray } });
      if (permisosExistentes.length !== permisosArray.length) {
        return res.status(400).json({
          msg: "Uno o más permisos no existen.",
        });
      }
      rolExistente.permisoRol = permisosArray;
    }

    if (estadoRol !== undefined) {
      rolExistente.estadoRol = estadoRol;
    }
    await rolExistente.save();

    res.json({ msg: "Rol actualizado exitosamente", rol: rolExistente });
  } catch (error) {
    responderError(res, error, "Error al actualizar el rol");
  }

  //     // Actualiza los campos del rol
  //     rolExistente.nombreRol = nombreRol || rolExistente.nombreRol
  //     rolExistente.permisoRol = permisoRol || rolExistente.permisoRol
  //     rolExistente.estadoRol = estadoRol !== undefined ? estadoRol : rolExistente.estadoRol

  //     // Determinar si es un rol admin al actualizar
  //     rolExistente.esAdmin = rolExistente.nombreRol.toLowerCase() === "admin"
};

// Método para cambiar el estado de un rol (activar/desactivar)
const rolesToggleEstado = async (req, res = response) => {
  const { id } = req.params;

  try {
    // Verificar si el rol con el id proporcionado existe
    const rol = await Rol.findById(id);
    if (!rol) {
      return res.status(404).json({
        msg: "Rol no encontrado",
      });
    }

    // Cambiar el estado del rol (de activo a inactivo o viceversa)
    rol.estadoRol = !rol.estadoRol;
    await rol.save();

    res.json({
      msg: `Rol ${rol.estadoRol ? "activado" : "desactivado"} exitosamente`,
      rol,
    });
  } catch (error) {
    responderError(res, error, "Error al cambiar el estado del rol");
  }
};

// Método DELETE para eliminar un rol por su id
const rolesDelete = async (req, res = response) => {
  const { id } = req.params;

  try {
    // Verificar si el rol con el id proporcionado existe
    const rol = isValidObjectId(id) && (await Rol.findById(id));
    if (!rol) {
      return res.status(404).json({
        msg: "Rol no encontrado",
      });
    }

    // Verificar si es un rol de Admin
    if (rol.nombreRol.toLowerCase() === "admin" || rol.esAdmin) {
      return res.status(403).json({
        msg: "No se puede eliminar el rol de Administrador",
        isAdminRole: true,
      });
    }

    // Los usuarios con este rol quedarían sin poder iniciar sesión
    const usuarios = await Usuario.countDocuments({ rol: id });
    if (usuarios > 0) {
      return res.status(409).json({
        msg: `No se puede eliminar: ${usuarios} usuario(s) tienen este rol. Asígnales otro rol o desactívalo.`,
      });
    }

    await Rol.findByIdAndDelete(id);

    res.json({
      msg: "Rol eliminado",
    });
  } catch (error) {
    responderError(res, error, "Error al eliminar el rol");
  }
};

// Método para exportar roles a Excel
const rolesExportExcel = async (req, res = response) => {
  try {
    // Obtener todos los roles con sus permisos
    const roles = await Rol.find().populate("permisoRol");

    if (roles.length === 0) {
      return res.status(404).json({
        msg: "No se encontraron roles para exportar",
      });
    }

    // Crear un nuevo libro de Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Roles");

    // Definir las columnas
    worksheet.columns = [
      { header: "ID", key: "id", width: 30 },
      { header: "Nombre del Rol", key: "nombreRol", width: 30 },
      { header: "Estado", key: "estadoRol", width: 15 },
      { header: "Es Admin", key: "esAdmin", width: 15 },
      { header: "Permisos", key: "permisos", width: 50 },
    ];

    // Estilo para el encabezado
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD3D3D3" },
    };

    // Agregar los datos
    roles.forEach((rol) => {
      // Obtener los nombres de los permisos
      const permisosNombres = rol.permisoRol.map((permiso) => permiso.nombrePermiso || "Permiso sin nombre").join(", ");

      worksheet.addRow({
        id: rol._id.toString(),
        nombreRol: rol.nombreRol,
        estadoRol: rol.estadoRol ? "Activo" : "Inactivo",
        esAdmin: rol.esAdmin ? "Sí" : "No",
        permisos: permisosNombres,
      });
    });

    // Configurar la respuesta
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=roles.xlsx");

    // Escribir el libro de Excel en la respuesta
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    responderError(res, error, "Error al exportar roles a Excel");
  }
};

module.exports = {
  rolesGet,
  rolesPost,
  rolesPut,
  rolesDelete,
  rolesToggleEstado,
  rolesExportExcel,
};
