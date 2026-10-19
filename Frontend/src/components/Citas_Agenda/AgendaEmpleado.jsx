"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import axios from "axios"
import Swal from "sweetalert2"
import dayjs from "dayjs"
import { Calendar } from "react-big-calendar"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { Plus, RefreshCw } from "lucide-react"
import FormularioCita from "./FormularioCita"
import DetalleCita from "./DetalleCita"
import { BarraCalendario, LeyendaEstados, crearEventoHoras } from "./PiezasCalendario"
import { HORA_MAX, HORA_MIN, aEvento, formatos, localizer, mensajes, propsEvento } from "./agendaComun"
import { usePermissions } from "../../hooks/usePermissions"
import "../../styles/tablas.css"
import "./agenda.css"

const API = `${import.meta.env.VITE_BACKEND_URL}/api`
const EventoHoras = crearEventoHoras({ mostrarEmpleado: false })

// Agenda del día con una columna por empleado
const AgendaEmpleado = () => {
  const { hasPermission } = usePermissions()
  const [citas, setCitas] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [fecha, setFecha] = useState(new Date())
  const [verCanceladas, setVerCanceladas] = useState(false)
  const [detalle, setDetalle] = useState(null)
  const [formulario, setFormulario] = useState(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const [respCitas, respEmpleados] = await Promise.all([axios.get(`${API}/citas`), axios.get(`${API}/empleados`)])
      setCitas(respCitas.data.citas || [])
      setEmpleados(respEmpleados.data.filter((e) => e.estadoempleado !== false))
    } catch {
      Swal.fire({ icon: "error", title: "No pudimos cargar la agenda" })
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  // Quien solo ve sus propias citas tiene una sola columna: la suya
  const veTodo = hasPermission("verCitas")
  const columnas = useMemo(() => {
    const visibles = veTodo ? empleados : empleados.filter((e) => e.esPropio)
    return visibles.map((e) => ({ id: e._id, nombre: e.nombreempleado, apellido: e.apellidoempleado }))
  }, [empleados, veTodo])

  const eventos = useMemo(
    () => citas.filter((c) => verCanceladas || c.estadocita !== "Cancelada").map(aEvento),
    [citas, verCanceladas],
  )

  const citasDelDia = useMemo(() => {
    const conteo = {}
    for (const e of eventos) {
      if (dayjs(e.start).isSame(fecha, "day") && e.cita.estadocita !== "Cancelada") {
        conteo[e.resourceId] = (conteo[e.resourceId] || 0) + 1
      }
    }
    return conteo
  }, [eventos, fecha])

  const CabeceraEmpleado = ({ resource }) => {
    const total = citasDelDia[resource.id] || 0
    return (
      <div className="agenda-columna">
        <span className="agenda-columna-inicial forma-una" aria-hidden="true">
          {resource.nombre?.charAt(0)}
        </span>
        <span>
          <span className="agenda-columna-nombre">
            {resource.nombre} {resource.apellido}
          </span>
          <span className="agenda-columna-conteo">
            {total === 0 ? "Sin citas" : `${total} cita${total === 1 ? "" : "s"}`}
          </span>
        </span>
      </div>
    )
  }

  const puedeCrear = hasPermission("crearCitas")

  const recargar = () => {
    setDetalle(null)
    cargar()
  }

  return (
    <div className="agenda">
      <div className="pagina-acciones">
        <h1 className="pagina-titulo" style={{ margin: 0 }}>
          Agenda por empleado
        </h1>
        <div className="agenda-botones">
          <label className="agenda-interruptor">
            <input type="checkbox" checked={verCanceladas} onChange={(e) => setVerCanceladas(e.target.checked)} />
            Mostrar canceladas
          </label>
          <button className="btn btn-secondary" onClick={cargar} disabled={cargando}>
            <RefreshCw size={16} aria-hidden="true" /> Actualizar
          </button>
          {puedeCrear && (
            <button className="btn btn-primary" onClick={() => setFormulario({ cita: null, fecha })}>
              <Plus size={16} aria-hidden="true" /> Nueva cita
            </button>
          )}
        </div>
      </div>

      <div className="agenda-calendario vista-day agenda-por-empleado" aria-busy={cargando}>
        {!cargando && columnas.length === 0 ? (
          <p className="agenda-vacio">No hay empleados activos para mostrar en la agenda.</p>
        ) : (
          <Calendar
            localizer={localizer}
            culture="es"
            events={eventos}
            view="day"
            views={["day"]}
            onView={() => {}}
            date={fecha}
            onNavigate={setFecha}
            resources={columnas}
            resourceIdAccessor="id"
            resourceTitleAccessor="nombre"
            formats={formatos}
            messages={mensajes}
            min={HORA_MIN}
            max={HORA_MAX}
            step={30}
            timeslots={2}
            selectable={puedeCrear}
            onSelectSlot={({ start }) => setFormulario({ cita: null, fecha: start })}
            onSelectEvent={(e) => setDetalle(e.cita)}
            eventPropGetter={propsEvento}
            components={{
              toolbar: BarraCalendario,
              event: EventoHoras,
              resourceHeader: CabeceraEmpleado,
            }}
          />
        )}
        <LeyendaEstados />
      </div>

      <DetalleCita
        cita={detalle}
        onCerrar={() => setDetalle(null)}
        onCambio={recargar}
        onEditar={(cita) => {
          setDetalle(null)
          setFormulario({ cita, fecha: new Date(cita.fechacita) })
        }}
      />

      {formulario && (
        <FormularioCita
          cita={formulario.cita}
          fechaSeleccionada={formulario.fecha}
          onCitaActualizada={cargar}
          onClose={() => setFormulario(null)}
        />
      )}
    </div>
  )
}

export default AgendaEmpleado
