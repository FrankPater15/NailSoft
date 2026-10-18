const { response } = require("express");
const Permiso = require("../modules/permiso");
const { permisoSchema } = require("../validators/permiso.validator");
const { responderError } = require("../utils/errores");

// Obtener todos los permisos
const permisosGet = async (req, res = response) => {
  try {
    const permisos = await Permiso.find();
    res.json({ permisos });
  } catch (error) {
    responderError(res, error, "Error al obtener los permisos");
  }
};

// Crear un nuevo permiso
const permisosPost = async (req, res = response) => {
  //VAlidación de los datos con Joi
  const { error } = permisoSchema.validate(req.body);

  if (error) {
    return res.status(400).json({ msg: error.details[0].message });
  }
  // Extraer datos del cuerpo de la solicitud
  const { nombrePermiso, descripcion, activo, categoria, nivel } = req.body;

  try {
    const permiso = new Permiso({
      nombrePermiso,
      descripcion,
      activo,
      categoria,
      nivel,
    });
    await permiso.save();
    res.status(201).json({
      msg: "Permiso creado correctamente",
      permiso,
    });
  } catch (error) {
    responderError(res, error, "Error al crear el permiso");
  }
};

// Actualizar un permiso
const permisosPut = async (req, res = response) => {
  const { id } = req.params;
  const { nombrePermiso, descripcion, activo, categoria, nivel } = req.body;

  try {
    const permiso = await Permiso.findById(id);
    if (!permiso) {
      return res.status(404).json({ msg: "Permiso no encontrado" });
    }
    if (nombrePermiso) permiso.nombrePermiso = nombrePermiso;
    if (descripcion) permiso.descripcion = descripcion;
    if (activo !== undefined) permiso.activo = activo;
    if (categoria) permiso.categoria = categoria;
    if (nivel) permiso.nivel = nivel;

    await permiso.save();
    res.json({
      msg: "Permiso actualizado correctamente",
      permiso,
    });
  } catch (error) {
    responderError(res, error, "Error al actualizar el permiso");
  }
};

// Eliminar un permiso
const permisosDelete = async (req, res = response) => {
  const { id } = req.params;
  try {
    const permiso = await Permiso.findByIdAndDelete(id);
    if (!permiso) {
      return res.status(404).json({ ok: false, msg: "Permiso no encontrado" });
    }
    res.json({ ok: true, msg: "Permiso eliminado correctamente" });
  } catch (error) {
    responderError(res, error, "Error al eliminar el permiso");
  }
};

// Exportar permisos a Excel
const permisosExportExcel = async (req, res = response) => {
  try {
    // Obtener todos los permisos
    const permisos = await Permiso.find();

    if (permisos.length === 0) {
      return res.status(404).json({
        msg: "No se encontraron permisos para exportar",
      });
    }

    // Crear un nuevo libro de Excel
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Permisos");

    // Definir las columnas
    worksheet.columns = [
      { header: "ID", key: "id", width: 30 },
      { header: "Nombre", key: "nombre", width: 30 },
      { header: "Descripción", key: "descripcion", width: 40 },
      { header: "Categoría", key: "categoria", width: 20 },
      { header: "Nivel", key: "nivel", width: 15 },
      { header: "Estado", key: "estado", width: 15 },
    ];

    // Estilo para el encabezado
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD3D3D3" },
    };

    // Agregar los datos
    permisos.forEach((permiso) => {
      worksheet.addRow({
        id: permiso._id.toString(),
        nombre: permiso.nombrePermiso,
        descripcion: permiso.descripcion,
        categoria: permiso.categoria,
        nivel: permiso.nivel === "read" ? "Lectura" : permiso.nivel === "write" ? "Escritura" : "Eliminación",
        estado: permiso.activo ? "Activo" : "Inactivo",
      });
    });

    // Configurar la respuesta
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", "attachment; filename=permisos.xlsx");

    // Escribir el libro de Excel en la respuesta
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    responderError(res, error, "Error al exportar permisos a Excel");
  }
};

module.exports = {
  permisosGet,
  permisosPost,
  permisosPut,
  permisosDelete,
  permisosExportExcel,
};
