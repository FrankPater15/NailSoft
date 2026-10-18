const { response } = require("express");
const { usuarioSchema, usuarioUpdateSchema } = require("../validators/usuario.validator");
const Rol = require("../modules/rol");
const Usuario = require("../modules/usuario");
const Cliente = require("../modules/cliente");
const Empleado = require("../modules/empleado");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { isValidObjectId } = require("mongoose");
const { tienePermiso } = require("../middlewares/verificarPermisos");

const {
  asegurarCliente,
  asegurarEmpleado,
  retirarCliente,
  retirarEmpleado,
  sincronizarCorreo,
} = require("../services/personas");
const { buscarEnlazado } = require("../middlewares/cargarPersona");
const { responderError } = require("../utils/errores");

const esElMismo = (req, id) => String(req.userId) === String(id);

// Obtener todos los usuarios (sin mostrar contraseñas)
const usuariosGet = async (req, res = response) => {
  try {
    const usuarios = await Usuario.find().select("-password").populate("rol", "nombreRol"); // Incluir información del rol

    res.json({
      usuarios,
    });
  } catch (error) {
    responderError(res, error, "Error al obtener usuarios");
  }
};

// NUEVO: Obtener un usuario específico por ID
const usuarioGetById = async (req, res = response) => {
  const { id } = req.params;

  // Cada usuario puede ver sus propios datos; los de otros requieren verUsuarios
  if (!esElMismo(req, id) && !tienePermiso(req, "verUsuarios")) {
    return res.status(404).json({ msg: "Usuario no encontrado" });
  }

  try {
    const usuario =
      isValidObjectId(id) &&
      (await Usuario.findById(id)
        .select("-password -resetPasswordToken -resetPasswordExpires")
        .populate("rol", "nombreRol"));

    if (!usuario) {
      return res.status(404).json({
        msg: "Usuario no encontrado",
      });
    }

    // Información adicional del cliente o empleado (enlazados con el usuario por correo)
    let infoAdicional = {};

    if (usuario.rol.nombreRol === "Cliente") {
      const cliente = await buscarEnlazado(Cliente, "correocliente", usuario);
      if (cliente) {
        infoAdicional = {
          nombrecliente: cliente.nombrecliente,
          apellidocliente: cliente.apellidocliente,
          correocliente: cliente.correocliente,
          celularcliente: cliente.celularcliente,
          estadocliente: cliente.estadocliente,
        };
      }
    } else if (usuario.rol.nombreRol === "Empleado") {
      const empleado = await buscarEnlazado(Empleado, "correoempleado", usuario);
      if (empleado) {
        infoAdicional = {
          nombreempleado: empleado.nombreempleado,
          apellidoempleado: empleado.apellidoempleado,
          correoempleado: empleado.correoempleado,
          telefonoempleado: empleado.telefonoempleado,
          especialidad: empleado.especialidad,
          salario: empleado.salario,
          estadoempleado: empleado.estadoempleado,
        };
      }
    }

    res.json({
      usuario,
      infoAdicional,
    });
  } catch (error) {
    responderError(res, error, "Error al obtener usuario por ID");
  }
};

// Crear un usuario con su rol; los roles Cliente y Empleado crean o enlazan su ficha
const usuariosPost = async (req, res = response) => {
  try {
    const { value, error } = usuarioSchema.validate(req.body, { abortEarly: false });

    if (error) {
      const errores = error.details.map((err) => err.message);
      return res.status(400).json({ errores });
    }

    const { nombre, apellido, email, celular, password, estado, rol } = value;

    // Verificar si el email ya existe
    const emailExistente = await Usuario.findOne({ $or: [{ correo: email }, { email }] });
    if (emailExistente) {
      return res.status(400).json({ msg: "El correo ya está registrado." });
    }

    // Verificar que el rol existe
    const rolAsignado = await Rol.findById(Array.isArray(rol) ? rol[0] : rol);
    if (!rolAsignado) {
      return res.status(400).json({ msg: "El rol proporcionado no existe." });
    }

    // 🔥 IMPORTANTE: Usar el mismo proceso de hash que en login
    const salt = await bcrypt.genSalt(12); // Usar 12 rondas como estándar
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear el usuario directamente para asegurar consistencia
    const nuevoUsuario = new Usuario({
      nombre,
      apellido,
      email,
      correo: email, // Asegurar que ambos campos tengan el mismo valor
      celular,
      password: hashedPassword, // Usar la contraseña hasheada
      rol: rolAsignado._id,
      estado: estado !== undefined ? estado : true,
    });

    // Guardar el usuario
    await nuevoUsuario.save();

    // Los roles "Cliente" y "Empleado" tienen ficha propia; si ya existía una con ese correo
    // (p. ej. un cliente atendido antes de tener cuenta) se enlaza en vez de duplicarla
    if (rolAsignado.nombreRol === "Cliente") await asegurarCliente(nuevoUsuario);
    if (rolAsignado.nombreRol === "Empleado") await asegurarEmpleado(nuevoUsuario);

    // Eliminar la contraseña de la respuesta
    const usuarioResponse = nuevoUsuario.toObject();
    delete usuarioResponse.password;

    res.status(201).json({
      msg: "Usuario registrado correctamente",
      usuario: usuarioResponse,
      role: rolAsignado.nombreRol,
    });
  } catch (err) {
    responderError(res, err, "Error interno del servidor");
  }
};

// Actualizar un usuario: cada uno edita sus datos; rol, estado y otros usuarios requieren actualizarUsuarios
const usuariosPut = async (req, res = response) => {
  const { id } = req.params;
  const puedeEditarOtros = tienePermiso(req, "actualizarUsuarios");

  // Sin actualizarUsuarios, cada uno solo edita sus propios datos
  if (!puedeEditarOtros && !esElMismo(req, id)) {
    return res.status(403).json({
      msg: 'No tienes el permiso "actualizarUsuarios" necesario para esta acción',
      permisoNoAsignado: true,
    });
  }

  try {
    // Solo los campos editables; el resto (p. ej. "correo" o "avatar" del perfil) se ignora.
    // El rol y el estado propios solo los cambia alguien con permiso.
    const editables = [
      "nombre",
      "apellido",
      "email",
      "celular",
      "password",
      "confirmPassword",
      "especialidad",
      "salario",
    ];
    if (puedeEditarOtros) editables.push("rol", "estado");
    const datos = Object.fromEntries(Object.entries(req.body).filter(([campo]) => editables.includes(campo)));

    const { value, error } = usuarioUpdateSchema.validate(datos, { abortEarly: false });

    if (error) {
      const errores = error.details.map((err) => err.message);
      return res.status(400).json({ errores });
    }

    const usuario = isValidObjectId(id) && (await Usuario.findById(id));
    if (!usuario) {
      return res.status(404).json({ msg: "Usuario no encontrado" });
    }

    const updates = value;

    // Un correo nuevo no puede estar en uso por otro usuario ni por otra ficha de cliente o empleado
    const nuevoEmail = updates.email?.toLowerCase().trim();
    const cambiaEmail = Boolean(nuevoEmail) && nuevoEmail !== usuario.email.toLowerCase();
    if (cambiaEmail) {
      const enUso = await Promise.all([
        Usuario.exists({ email: nuevoEmail, _id: { $ne: id } }),
        Cliente.exists({ correocliente: nuevoEmail, usuario: { $ne: usuario._id } }),
        Empleado.exists({ correoempleado: nuevoEmail, usuario: { $ne: usuario._id } }),
      ]);
      if (enUso.some(Boolean)) {
        return res.status(400).json({ msg: "El correo ya está registrado." });
      }
      updates.email = nuevoEmail;
    }

    if (updates.password) {
      const salt = bcrypt.genSaltSync();
      updates.password = bcrypt.hashSync(updates.password, salt);
    }

    const actualizado = await Usuario.findByIdAndUpdate(id, updates, { new: true })
      .select("-password -resetPasswordToken -resetPasswordExpires")
      .populate("rol", "nombreRol");

    if (cambiaEmail) await sincronizarCorreo(usuario._id, nuevoEmail);

    const respuesta = { msg: "Usuario actualizado correctamente", usuario: actualizado };
    // Cambiar la contraseña cierra las demás sesiones; quien la cambió recibe un token nuevo
    if (updates.password && esElMismo(req, id)) {
      respuesta.token = jwt.sign({ userId: usuario._id, role: actualizado.rol?.nombreRol }, process.env.JWT_SECRET, {
        expiresIn: "24h",
      });
    }

    res.json(respuesta);
  } catch (err) {
    responderError(res, err, "Error al actualizar el usuario");
  }
};

// NUEVO: Actualizar solo el rol de un usuario
const usuariosUpdateRol = async (req, res = response) => {
  const { id } = req.params;
  const { rol } = req.body;

  if (!rol) {
    return res.status(400).json({
      msg: "El rol es obligatorio",
    });
  }

  try {
    // Verificar si el usuario existe
    const usuario = await Usuario.findById(id).populate("rol");
    if (!usuario) {
      return res.status(404).json({
        msg: "Usuario no encontrado",
      });
    }

    // Verificar que el nuevo rol exista
    const nuevoRol = await Rol.findById(rol);
    if (!nuevoRol) {
      return res.status(400).json({
        msg: "El rol especificado no existe",
      });
    }

    // Si el rol no ha cambiado, no hacer nada
    if (rol === usuario.rol._id.toString()) {
      return res.json({
        msg: "El rol no ha cambiado",
        usuario,
      });
    }

    // Los roles "Cliente" y "Empleado" tienen ficha propia: al cambiar de rol se crea o reactiva
    // la nueva y se retira la anterior (si tiene historial se desactiva en vez de borrarse)
    const eraCliente = usuario.rol.nombreRol === "Cliente";
    const eraEmpleado = usuario.rol.nombreRol === "Empleado";
    const seraCliente = nuevoRol.nombreRol === "Cliente";
    const seraEmpleado = nuevoRol.nombreRol === "Empleado";

    if (eraCliente && !seraCliente) await retirarCliente(usuario);
    if (eraEmpleado && !seraEmpleado) await retirarEmpleado(usuario);
    if (seraCliente) await asegurarCliente(usuario);
    if (seraEmpleado) await asegurarEmpleado(usuario);

    // Actualizar el rol del usuario
    const usuarioActualizado = await Usuario.findByIdAndUpdate(id, { rol: nuevoRol._id }, { new: true })
      .select("-password")
      .populate("rol");

    res.json({
      msg: "Rol actualizado correctamente",
      usuario: usuarioActualizado,
    });
  } catch (error) {
    responderError(res, error, "Error al actualizar rol");
  }
};

// Eliminar un usuario
const usuariosDelete = async (req, res = response) => {
  const { id } = req.params;

  try {
    // Verificar si el usuario existe
    const usuario = await Usuario.findById(id).populate("rol");
    if (!usuario) {
      return res.status(404).json({
        msg: "Usuario no encontrado",
      });
    }

    // Retira sus fichas de cliente y empleado (si tienen historial quedan desactivadas)
    await retirarCliente(usuario);
    await retirarEmpleado(usuario);

    // Eliminar el usuario
    const usuarioEliminado = await Usuario.findByIdAndDelete(id);

    res.json({
      msg: "Usuario eliminado correctamente",
      usuario: usuarioEliminado,
    });
  } catch (error) {
    responderError(res, error, "Error al eliminar usuario");
  }
};

// Escapa el texto para usarlo literal dentro de una expresión regular
const escaparRegex = (texto) => String(texto).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Buscar usuarios por texto (q en nombre, apellido o correo; nombre) con paginación (page, limit)
const PromGet = async (req, res = response) => {
  const { page = 1, limit = 10 } = req.query;
  const q = req.query.q && escaparRegex(req.query.q);
  const nombre = req.query.nombre && escaparRegex(req.query.nombre);
  const limitNum = Number(limit);
  const skip = (Number(page) - 1) * limitNum;

  try {
    // Construir filtro
    const filtro = {};
    if (q) {
      filtro.$or = [
        { nombre: { $regex: q, $options: "i" } },
        { apellido: { $regex: q, $options: "i" } },
        { correo: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }
    if (nombre) {
      filtro.nombre = { $regex: nombre, $options: "i" };
    }

    // Consultar usuarios con paginación
    const [total, usuarios] = await Promise.all([
      Usuario.countDocuments(filtro),
      Usuario.find(filtro).select("-password").populate("rol", "nombreRol").skip(skip).limit(limitNum),
    ]);

    res.json({
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: Number(page),
      limit: limitNum,
      usuarios,
    });
  } catch (error) {
    responderError(res, error, "Error al obtener usuarios");
  }
};

// Activar cuenta de usuario
const activateAccount = async (req, res = response) => {
  const { email } = req.body;

  try {
    // Verificar si el email existe
    const usuario = await Usuario.findOne({ correo: email });

    if (!usuario) {
      return res.status(404).json({
        msg: "No se encontró ninguna cuenta con ese correo electrónico",
      });
    }

    // Verificar si la cuenta ya está activa
    if (usuario.estado) {
      return res.status(400).json({
        msg: "Esta cuenta ya está activa",
      });
    }

    // Activar la cuenta
    usuario.estado = true;
    await usuario.save();

    res.json({
      msg: "Cuenta activada correctamente",
    });
  } catch (error) {
    responderError(res, error, "Error al activar la cuenta");
  }
};

// Añadir esta nueva función al final del archivo, antes del module.exports
// Activar/Desactivar un usuario
const usuariosToggleEstado = async (req, res = response) => {
  const { id } = req.params;

  try {
    // Verificar si el usuario existe y popular el campo rol
    const usuario = await Usuario.findById(id).populate("rol");
    if (!usuario) {
      return res.status(404).json({
        msg: "Usuario no encontrado",
      });
    }

    // Validar si el rol es Admin
    if (usuario.rol && usuario.rol.nombreRol === "Admin") {
      return res.status(403).json({
        msg: "No está permitido desactivar o cambiar el estado de un administrador",
      });
    }

    // Cambiar el estado sin modificar otros campos
    const nuevoEstado = !usuario.estado;

    // Actualizar solo el campo estado
    await Usuario.findByIdAndUpdate(id, { estado: nuevoEstado });

    // Si el usuario es un cliente o empleado, actualizar también su estado en esas colecciones
    if (usuario.rol.nombreRol === "Cliente") {
      await Cliente.findOneAndUpdate({ usuario: id }, { estadocliente: nuevoEstado });
    } else if (usuario.rol.nombreRol === "Empleado") {
      await Empleado.findOneAndUpdate({ usuario: id }, { estadoempleado: nuevoEstado });
    }

    // Obtener el usuario actualizado para la respuesta
    const usuarioActualizado = await Usuario.findById(id).select("-password");

    res.json({
      msg: `Usuario ${nuevoEstado ? "activado" : "desactivado"} correctamente`,
      usuario: usuarioActualizado,
    });
  } catch (error) {
    responderError(res, error, "Error al cambiar estado del usuario");
  }
};

// Asegúrate de exportar la nueva función
module.exports = {
  usuariosGet,
  usuarioGetById,
  usuariosPost,
  usuariosPut,
  usuariosUpdateRol,
  usuariosDelete,
  PromGet,
  activateAccount,
  usuariosToggleEstado,
};
