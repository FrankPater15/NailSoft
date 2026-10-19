"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import axios from "axios"
import Swal from "sweetalert2"
import { Calendar } from "react-big-calendar"
import "react-big-calendar/lib/css/react-big-calendar.css"
import { Plus, RefreshCw, Search } from "lucide-react"
import FormularioCita from "./FormularioCita"
import DetalleCita from "./DetalleCita"
import { BarraCalendario, EventoMes, LeyendaEstados, crearEventoHoras } from "./PiezasCalendario"
import {
  ESTADOS,
  HORA_MAX,
  HORA_MIN,
  aEvento,
  coincideBusqueda,
  formatos,
  localizer,
  mensajes,
  propsEvento,
} from "./agendaComun"
import { usePermissions } from "../../hooks/usePermissions"
import "../../styles/tablas.css"
import "./agenda.css"

const API = `${import.meta.env.VITE_BACKEND_URL}/api`
const VISTAS = ["month", "week", "day"]
const EventoHoras = crearEventoHoras({ mostrarEmpleado: true })

// Calendario de citas del spa (mes, semana y día)
const TablaCitas = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()

  const [citas, setCitas] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")
  const [filtroEmpleado, setFiltroEmpleado] = useState("")
  const [vista, setVista] = useState("month")
  const [fecha, setFecha] = useState(new Date())
  const [detalle, setDetalle] = useState(null)
  const [formulario, setFormulario] = useState(null) // { cita, fecha }

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      const { data } = await axios.get(`${API}/citas`)
      setCitas(data.citas || [])
    } catch {
      Swal.fire({ icon: "error", title: "No pudimos cargar las citas" })
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
    axios
      .get(`${API}/empleados`)
      .then(({ data }) => setEmpleados(data.filter((e) => e.estadoempleado !== false)))
      .catch(() => setEmpleados([]))
  }, [cargar])

  // Desde el dashboard se puede llegar con una cita ya elegida
  useEffect(() => {
    const elegida = location.state?.citaSeleccionada
    if (elegida) {
      setDetalle(elegida)
      setFecha(new Date(elegida.fechacita))
      navigate(location.pathname, { replace: true })
    }
  }, [location.state, location.pathname, navigate])

  const eventos = useMemo(
    () =>
      citas
        .filter((c) => !filtroEstado || c.estadocita === filtroEstado)
        .filter((c) => !filtroEmpleado || c.nombreempleado?._id === filtroEmpleado)
        .filter((c) => coincideBusqueda(c, busqueda))
        .map(aEvento),
    [citas, filtroEstado, filtroEmpleado, busqueda],
  )

  const hayFiltros = busqueda || filtroEstado || filtroEmpleado
  const limpiar = () => {
    setBusqueda("")
    setFiltroEstado("")
    setFiltroEmpleado("")
  }

  const puedeCrear = hasPermission("crearCitas")

  // En el mes, un clic en un día abre ese día; en las vistas por horas, crea una cita en ese hueco
  const alSeleccionarHueco = ({ start, action }) => {
    if (vista === "month") {
      setFecha(start)
      setVista("day")
    } else if (puedeCrear && action !== "doubleClick") {
      setFormulario({ cita: null, fecha: start })
    }
  }

  const recargar = () => {
    setDetalle(null)
    cargar()
  }

  return (
    <div className="agenda">
      <div className="pagina-acciones">
        <h1 className="pagina-titulo" style={{ margin: 0 }}>
          Citas
        </h1>
        <div className="agenda-botones">
          <button className="btn btn-secondary" onClick={cargar} disabled={cargando}>
            <RefreshCw size={16} aria-hidden="true" /> Actualizar
          </button>
          {puedeCrear && (
            <button className="btn btn-primary" onClick={() => setFormulario({ cita: null, fecha: null })}>
              <Plus size={16} aria-hidden="true" /> Nueva cita
            </button>
          )}
        </div>
      </div>

      <div className="agenda-filtros">
        <label className="agenda-busqueda">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar clienta, empleado o servicio"
            aria-label="Buscar citas"
          />
        </label>
        <select
          className="form-select"
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          aria-label="Filtrar por estado"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.etiqueta || e.valor}
            </option>
          ))}
        </select>
        <select
          className="form-select"
          value={filtroEmpleado}
          onChange={(e) => setFiltroEmpleado(e.target.value)}
          aria-label="Filtrar por empleado"
        >
          <option value="">Todo el equipo</option>
          {empleados.map((e) => (
            <option key={e._id} value={e._id}>
              {e.nombreempleado} {e.apellidoempleado}
            </option>
          ))}
        </select>
        {hayFiltros && (
          <button type="button" className="agenda-limpiar" onClick={limpiar}>
            Quitar filtros
          </button>
        )}
      </div>

      <div className={`agenda-calendario vista-${vista}`} aria-busy={cargando}>
        <Calendar
          localizer={localizer}
          culture="es"
          events={eventos}
          view={vista}
          views={VISTAS}
          onView={setVista}
          date={fecha}
          onNavigate={setFecha}
          formats={formatos}
          messages={mensajes}
          min={HORA_MIN}
          max={HORA_MAX}
          step={30}
          timeslots={2}
          selectable
          popup
          onSelectSlot={alSeleccionarHueco}
          onSelectEvent={(e) => setDetalle(e.cita)}
          eventPropGetter={propsEvento}
          components={{
            toolbar: BarraCalendario,
            month: { event: EventoMes },
            week: { event: EventoHoras },
            day: { event: EventoHoras },
          }}
        />
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

export default TablaCitas
