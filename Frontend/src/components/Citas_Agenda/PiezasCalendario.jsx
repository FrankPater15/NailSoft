import { ChevronLeft, ChevronRight } from "lucide-react"
import { ESTADOS, etiquetaEstado, nombreServicios, nombreEmpleado } from "./agendaComun"

const NOMBRES_VISTA = { month: "Mes", week: "Semana", day: "Día" }

// Barra superior del calendario: navegación, título del rango y cambio de vista
export function BarraCalendario({ label, onNavigate, onView, view, views }) {
  const vistas = Array.isArray(views) ? views : Object.keys(views || {})
  return (
    <div className="cal-barra">
      <div className="cal-navegacion">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onNavigate("TODAY")}>
          Hoy
        </button>
        <button type="button" className="boton-icono" onClick={() => onNavigate("PREV")} aria-label="Anterior">
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <button type="button" className="boton-icono" onClick={() => onNavigate("NEXT")} aria-label="Siguiente">
          <ChevronRight size={18} aria-hidden="true" />
        </button>
        <h2 className="cal-titulo">{label}</h2>
      </div>
      {vistas.length > 1 && (
        <div className="cal-vistas" role="group" aria-label="Vista del calendario">
          {vistas.map((v) => (
            <button
              key={v}
              type="button"
              className={v === view ? "activa" : ""}
              aria-pressed={v === view}
              onClick={() => onView(v)}
            >
              {NOMBRES_VISTA[v] || v}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Cita dentro del calendario. En el mes basta hora y clienta; en las vistas por horas se ve el detalle.
export function EventoMes({ event }) {
  return (
    <span className="cita-evento-linea">
      <span className="cita-evento-hora">{event.cita.horacita}</span> {event.title}
    </span>
  )
}

export function crearEventoHoras({ mostrarEmpleado }) {
  return function EventoHoras({ event }) {
    return (
      <div className="cita-evento-bloque">
        <p className="cita-evento-cliente">{event.title}</p>
        <p className="cita-evento-servicios">{nombreServicios(event.cita)}</p>
        {mostrarEmpleado && <p className="cita-evento-servicios">Con {nombreEmpleado(event.cita)}</p>}
      </div>
    )
  }
}

export function LeyendaEstados() {
  return (
    <ul className="cal-leyenda" aria-label="Estados de las citas">
      {ESTADOS.map((e) => (
        <li key={e.valor} className={`estado-${e.clase}`}>
          <span className="esmalte" aria-hidden="true" />
          {etiquetaEstado(e.valor)}
        </li>
      ))}
    </ul>
  )
}
