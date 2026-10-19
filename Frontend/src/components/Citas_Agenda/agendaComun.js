// Piezas compartidas por el calendario de citas y la agenda por empleado
import { dayjsLocalizer } from "react-big-calendar"
import dayjs from "dayjs"
import "dayjs/locale/es"

dayjs.locale("es")
export const localizer = dayjsLocalizer(dayjs)

const mayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1)
const hora = (fecha) => dayjs(fecha).format("HH:mm")

export const formatos = {
  monthHeaderFormat: (fecha) => mayuscula(dayjs(fecha).format("MMMM [de] YYYY")),
  dayHeaderFormat: (fecha) => mayuscula(dayjs(fecha).format("dddd, D [de] MMMM")),
  dayRangeHeaderFormat: ({ start, end }) =>
    dayjs(start).month() === dayjs(end).month()
      ? `${dayjs(start).format("D")} – ${dayjs(end).format("D [de] MMMM")}`
      : `${dayjs(start).format("D [de] MMM")} – ${dayjs(end).format("D [de] MMM")}`,
  dateFormat: (fecha) => dayjs(fecha).format("D"),
  weekdayFormat: (fecha) => mayuscula(dayjs(fecha).format("ddd").replace(".", "")),
  dayFormat: (fecha) => mayuscula(dayjs(fecha).format("ddd D").replace(".", "")),
  timeGutterFormat: (fecha) => hora(fecha),
  eventTimeRangeFormat: ({ start, end }) => `${hora(start)} – ${hora(end)}`,
  selectRangeFormat: ({ start, end }) => `${hora(start)} – ${hora(end)}`,
}

export const mensajes = {
  date: "Fecha",
  time: "Hora",
  event: "Cita",
  allDay: "Todo el día",
  week: "Semana",
  day: "Día",
  month: "Mes",
  previous: "Anterior",
  next: "Siguiente",
  today: "Hoy",
  agenda: "Lista",
  noEventsInRange: "No hay citas en este rango.",
  showMore: (total) => `+${total} más`,
}

// Horario visible en las vistas por horas (el spa atiende de 9 a 18)
const hoy = new Date()
export const HORA_MIN = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 8, 0)
export const HORA_MAX = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 19, 0)

export const ESTADOS = [
  { valor: "Pendiente", clase: "pendiente" },
  { valor: "Confirmada", clase: "confirmada" },
  { valor: "En Progreso", clase: "progreso", etiqueta: "En progreso" },
  { valor: "Completada", clase: "completada" },
  { valor: "Cancelada", clase: "cancelada" },
]
export const claseEstado = (estado) => ESTADOS.find((e) => e.valor === estado)?.clase || "pendiente"
export const etiquetaEstado = (estado) => ESTADOS.find((e) => e.valor === estado)?.etiqueta || estado

export const pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })

export const nombreCliente = (cita) => {
  const c = cita.nombrecliente
  if (!c) return "Clienta sin registro"
  return [c.nombrecliente, c.apellidocliente].filter(Boolean).join(" ")
}
export const nombreEmpleado = (cita) => {
  const e = cita.nombreempleado
  if (!e) return "Sin asignar"
  return [e.nombreempleado, e.apellidoempleado].filter(Boolean).join(" ")
}
export const nombreServicios = (cita) => (cita.servicios || []).map((s) => s.nombreServicio).join(", ")

// Convierte una cita de la API en un evento del calendario
export const aEvento = (cita) => {
  const inicio = new Date(cita.fechacita)
  const fin = dayjs(inicio)
    .add(cita.duracionTotal || 60, "minute")
    .toDate()
  return {
    id: cita._id,
    title: nombreCliente(cita),
    start: inicio,
    end: fin,
    resourceId: cita.nombreempleado?._id,
    cita,
  }
}

export const propsEvento = (evento) => ({ className: `cita-evento estado-${claseEstado(evento.cita.estadocita)}` })

export const coincideBusqueda = (cita, texto) => {
  if (!texto) return true
  const t = texto.toLocaleLowerCase("es")
  return [nombreCliente(cita), nombreEmpleado(cita), nombreServicios(cita)].some((v) =>
    v.toLocaleLowerCase("es").includes(t),
  )
}
