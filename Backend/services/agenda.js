// Reglas de la agenda: cuándo ocupa una cita el horario de un empleado y si una cita nueva cabe.
const { isValidObjectId } = require("mongoose");
const Cita = require("../modules/cita");
const Empleado = require("../modules/empleado");
const Servicio = require("../modules/servicio");
const { ErrorNegocio } = require("../utils/errores");

// Horario de atención (hora local): la cita debe empezar y terminar dentro de él
const HORA_APERTURA = 9 * 60;
const HORA_CIERRE = 18 * 60;

// Estados que ya no ocupan el horario del empleado
const ESTADOS_LIBRES = ["Cancelada"];

const formatoHora = /^([01]\d|2[0-3]):([0-5]\d)$/;

const minutosDeHora = (horacita) => {
  const coincidencia = formatoHora.exec(String(horacita || ""));
  if (!coincidencia) throw new ErrorNegocio("La hora de la cita debe tener el formato HH:MM");
  return Number(coincidencia[1]) * 60 + Number(coincidencia[2]);
};

const textoHora = (minutos) =>
  `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;

// Día local de una fecha. Acepta "YYYY-MM-DD" (sin desfase de zona horaria) o cualquier fecha válida.
const inicioDelDia = (fecha) => {
  const soloFecha = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fecha));
  const dia = soloFecha
    ? new Date(Number(soloFecha[1]), Number(soloFecha[2]) - 1, Number(soloFecha[3]))
    : new Date(fecha);
  if (Number.isNaN(dia.getTime())) throw new ErrorNegocio("La fecha de la cita no es válida");
  dia.setHours(0, 0, 0, 0);
  return dia;
};

// Inicio real de la cita: el día de `fechacita` a la hora de `horacita`
const inicioDeCita = (fechacita, horacita) => {
  const inicio = inicioDelDia(fechacita);
  inicio.setMinutes(minutosDeHora(horacita));
  return inicio;
};

const finDelDia = (dia) => {
  const fin = new Date(dia);
  fin.setHours(23, 59, 59, 999);
  return fin;
};

// Citas que ocupan el horario de un empleado ese día (opcionalmente excluyendo una)
const citasQueOcupan = (empleadoId, dia, excluirId) => {
  const filtro = {
    nombreempleado: empleadoId,
    fechacita: { $gte: dia, $lte: finDelDia(dia) },
    estadocita: { $nin: ESTADOS_LIBRES },
    horarioLiberado: { $ne: true },
  };
  if (excluirId) filtro._id = { $ne: excluirId };
  return Cita.find(filtro).select("horacita duracionTotal");
};

const seCruzan = (inicioA, finA, inicioB, finB) => inicioA < finB && inicioB < finA;

// Lanza un 409 si [inicio, inicio + duracion) choca con otra cita del empleado
const validarSinChoque = async ({ empleadoId, fechacita, horacita, duracion, excluirId }) => {
  const dia = inicioDelDia(fechacita);
  const inicio = minutosDeHora(horacita);
  const fin = inicio + duracion;
  const otras = await citasQueOcupan(empleadoId, dia, excluirId);
  const choque = otras.find((cita) => {
    const inicioOtra = minutosDeHora(cita.horacita);
    return seCruzan(inicio, fin, inicioOtra, inicioOtra + (cita.duracionTotal || 60));
  });
  if (choque) {
    throw new ErrorNegocio(
      `El empleado ya tiene una cita de ${choque.horacita} a ${textoHora(minutosDeHora(choque.horacita) + (choque.duracionTotal || 60))} ese día`,
      409,
    );
  }
};

// Lanza un 400 si la cita no cabe en el horario de atención
const validarHorarioAtencion = (horacita, duracion) => {
  const inicio = minutosDeHora(horacita);
  if (inicio < HORA_APERTURA || inicio + duracion > HORA_CIERRE) {
    throw new ErrorNegocio(
      `La cita debe empezar y terminar entre las ${textoHora(HORA_APERTURA)} y las ${textoHora(HORA_CIERRE)}`,
    );
  }
};

// Convierte los servicios recibidos (ids sueltos, {servicio} o {_id}) en las líneas de la cita
// con precio y duración tomados de la base de datos.
const prepararServiciosCita = async (servicios) => {
  if (!Array.isArray(servicios) || servicios.length === 0) {
    throw new ErrorNegocio("Debe proporcionar al menos un servicio");
  }
  const ids = servicios.map((s) =>
    String(typeof s === "object" && s !== null ? s.servicio?._id || s.servicio || s._id : s),
  );
  if (!ids.every(isValidObjectId)) throw new ErrorNegocio("Uno o más servicios no son válidos");

  const serviciosDB = await Servicio.find({ _id: { $in: [...new Set(ids)] } });
  const porId = new Map(serviciosDB.map((s) => [String(s._id), s]));
  const lineas = ids.map((id) => {
    const servicio = porId.get(id);
    if (!servicio) throw new ErrorNegocio("Uno o más servicios no existen");
    if (servicio.estado === false)
      throw new ErrorNegocio(`El servicio "${servicio.nombreServicio}" no está disponible`);
    return {
      servicio: servicio._id,
      nombreServicio: servicio.nombreServicio,
      precio: servicio.precio,
      tiempo: servicio.tiempo,
    };
  });

  return {
    servicios: lineas,
    duracionTotal: lineas.reduce((total, s) => total + s.tiempo, 0),
    montototal: lineas.reduce((total, s) => total + s.precio, 0),
  };
};

const validarEmpleadoActivo = async (empleadoId) => {
  const empleado = isValidObjectId(empleadoId) && (await Empleado.findById(empleadoId));
  if (!empleado) throw new ErrorNegocio("Empleado no encontrado");
  if (!empleado.estadoempleado) throw new ErrorNegocio("El empleado no está activo");
  return empleado;
};

// Franjas libres de media hora para un empleado, un día y una duración
const horariosDisponibles = async ({ empleadoId, fecha, duracion }) => {
  const dia = inicioDelDia(fecha);
  const ocupadas = (await citasQueOcupan(empleadoId, dia)).map((cita) => {
    const inicio = minutosDeHora(cita.horacita);
    return [inicio, inicio + (cita.duracionTotal || 60)];
  });
  const libres = [];
  const ahora = new Date();
  for (let inicio = HORA_APERTURA; inicio + duracion <= HORA_CIERRE; inicio += 30) {
    if (!ocupadas.some(([a, b]) => seCruzan(inicio, inicio + duracion, a, b))) {
      const fechaInicio = new Date(dia);
      fechaInicio.setMinutes(inicio);
      if (fechaInicio <= ahora) continue; // las horas que ya pasaron no se ofrecen
      const fechaFin = new Date(dia);
      fechaFin.setMinutes(inicio + duracion);
      libres.push({ hora: textoHora(inicio), duracion, inicio: fechaInicio, fin: fechaFin });
    }
  }
  return libres;
};

module.exports = {
  ESTADOS_LIBRES,
  inicioDelDia,
  inicioDeCita,
  finDelDia,
  minutosDeHora,
  validarSinChoque,
  validarHorarioAtencion,
  prepararServiciosCita,
  validarEmpleadoActivo,
  horariosDisponibles,
};
