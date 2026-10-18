"use client"

import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import Swal from "sweetalert2"
import { Check, ChevronLeft } from "lucide-react"
import { enlaceWhatsapp } from "../../config/contacto"
import "./reservar.css"

const API = import.meta.env.VITE_BACKEND_URL
const pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
const diaLargo = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" })
const diaCorto = new Intl.DateTimeFormat("es-CO", { weekday: "short" })

// "YYYY-MM-DD" en hora local (el servidor interpreta así la fecha de la cita)
const isoLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

const proximosDias = (cantidad) =>
  Array.from({ length: cantidad }, (_, i) => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + i)
    return d
  })

const PASOS = ["Servicios", "Profesional y hora", "Confirmar"]

export default function Reservar() {
  const navigate = useNavigate()
  const [paso, setPaso] = useState(0)
  const [servicios, setServicios] = useState(null)
  const [empleados, setEmpleados] = useState(null)
  const [error, setError] = useState("")

  const [elegidos, setElegidos] = useState([])
  const [empleado, setEmpleado] = useState(null)
  const [fecha, setFecha] = useState(isoLocal(new Date()))
  const [horarios, setHorarios] = useState(null)
  const [hora, setHora] = useState("")
  const [guardando, setGuardando] = useState(false)

  const dias = useMemo(() => proximosDias(14), [])

  useEffect(() => {
    Promise.all([axios.get(`${API}/api/catalogo`), axios.get(`${API}/api/empleados`)])
      .then(([cat, emp]) => {
        setServicios(cat.data.servicios)
        setEmpleados(emp.data.filter((e) => e.estadoempleado))
      })
      .catch(() => setError("No pudimos cargar los servicios. Recarga la página para intentar de nuevo."))
  }, [])

  // Horarios libres según profesional, día y duración de los servicios elegidos
  useEffect(() => {
    if (!empleado || elegidos.length === 0) return
    setHorarios(null)
    setHora("")
    axios
      .post(`${API}/api/citas/verificar-disponibilidad`, {
        nombreempleado: empleado._id,
        fecha,
        servicios: elegidos.map((s) => s._id),
      })
      .then(({ data }) => setHorarios(data.horariosDisponibles))
      .catch(() => setHorarios([]))
  }, [empleado, fecha, elegidos])

  const total = elegidos.reduce((t, s) => t + s.precioFinal, 0)
  const duracion = elegidos.reduce((t, s) => t + s.tiempo, 0)
  const alternar = (servicio) =>
    setElegidos((actual) =>
      actual.some((s) => s._id === servicio._id) ? actual.filter((s) => s._id !== servicio._id) : [...actual, servicio],
    )

  const puedeSeguir = [elegidos.length > 0, Boolean(empleado && hora), true][paso]

  const confirmar = async () => {
    setGuardando(true)
    try {
      await axios.post(`${API}/api/citas`, {
        nombreempleado: empleado._id,
        fechacita: fecha,
        horacita: hora,
        estadocita: "Pendiente",
        servicios: elegidos.map((s) => s._id),
      })
      await Swal.fire({
        icon: "success",
        title: "Cita reservada",
        text: `Te esperamos el ${diaLargo.format(new Date(`${fecha}T00:00`))} a las ${hora} con ${empleado.nombreempleado}.`,
        confirmButtonText: "Ver mis citas",
      })
      navigate("/mi-cuenta")
    } catch (err) {
      const mensaje = err.response?.data?.message || err.response?.data?.msg
      if (err.response?.status === 409) {
        // Alguien tomó ese horario mientras confirmaba
        setPaso(1)
        setHora("")
        setHorarios(null)
        setEmpleado({ ...empleado })
      }
      Swal.fire({
        icon: "error",
        title: "No pudimos reservar",
        text: mensaje || "Intenta de nuevo en unos minutos.",
        confirmButtonText: "Entendido",
      })
    } finally {
      setGuardando(false)
    }
  }

  if (error) {
    return (
      <div className="reservar">
        <p className="reservar-error">{error}</p>
      </div>
    )
  }

  return (
    <div className="reservar">
      <header className="reservar-cabecera">
        <h1 className="reservar-titulo">Reserva tu cita</h1>
        <ol className="reservar-pasos" aria-label="Pasos de la reserva">
          {PASOS.map((nombre, i) => (
            <li key={nombre} className={i === paso ? "actual" : i < paso ? "hecho" : ""} aria-current={i === paso ? "step" : undefined}>
              <span className="reservar-paso-num">{i < paso ? <Check size={14} /> : i + 1}</span>
              {nombre}
            </li>
          ))}
        </ol>
      </header>

      <div className="reservar-cuerpo">
        <section className="reservar-contenido">
          {paso === 0 && (
            <>
              <h2 className="reservar-subtitulo">¿Qué te quieres hacer?</h2>
              <p className="reservar-ayuda">Puedes elegir varios servicios para la misma cita.</p>
              {!servicios ? (
                <div className="reservar-cargando" aria-busy="true" />
              ) : (
                <ul className="reservar-servicios">
                  {servicios.map((s) => {
                    const activo = elegidos.some((e) => e._id === s._id)
                    return (
                      <li key={s._id}>
                        <button
                          type="button"
                          className={`reservar-servicio ${activo ? "activo" : ""}`}
                          onClick={() => alternar(s)}
                          aria-pressed={activo}
                        >
                          <img src={`${API}/uploads/${s.imagenUrl}`} alt="" loading="lazy" />
                          <span className="reservar-servicio-info">
                            <span className="reservar-servicio-nombre">{s.nombreServicio}</span>
                            <span className="reservar-servicio-meta">
                              {s.tiempo} min
                              {s.promocion && <span className="reservar-promo">{s.promocion.descuento}% menos</span>}
                            </span>
                          </span>
                          <span className="reservar-servicio-precio">
                            {s.promocion && <s>{pesos.format(s.precio)}</s>}
                            {pesos.format(s.precioFinal)}
                          </span>
                          <span className="reservar-check" aria-hidden="true">
                            {activo && <Check size={14} strokeWidth={3} />}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}

          {paso === 1 && (
            <>
              <h2 className="reservar-subtitulo">¿Con quién y cuándo?</h2>
              <div className="reservar-bloque">
                <h3 className="reservar-etiqueta">Profesional</h3>
                <div className="reservar-chips">
                  {(empleados || []).map((e) => (
                    <button
                      key={e._id}
                      type="button"
                      className={`reservar-chip ${empleado?._id === e._id ? "activo" : ""}`}
                      onClick={() => setEmpleado(e)}
                      aria-pressed={empleado?._id === e._id}
                    >
                      <span className="reservar-inicial">{e.nombreempleado.charAt(0)}</span>
                      {e.nombreempleado} {e.apellidoempleado}
                    </button>
                  ))}
                </div>
              </div>

              <div className="reservar-bloque">
                <h3 className="reservar-etiqueta">Día</h3>
                <div className="reservar-dias">
                  {dias.map((d) => {
                    const valor = isoLocal(d)
                    return (
                      <button
                        key={valor}
                        type="button"
                        className={`reservar-dia ${fecha === valor ? "activo" : ""}`}
                        onClick={() => setFecha(valor)}
                        aria-pressed={fecha === valor}
                        aria-label={diaLargo.format(d)}
                      >
                        <span>{diaCorto.format(d).replace(".", "")}</span>
                        <strong>{d.getDate()}</strong>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="reservar-bloque">
                <h3 className="reservar-etiqueta">Hora</h3>
                {!empleado ? (
                  <p className="reservar-ayuda">Elige una profesional para ver sus horarios libres.</p>
                ) : horarios === null ? (
                  <div className="reservar-cargando corto" aria-busy="true" />
                ) : horarios.length === 0 ? (
                  <p className="reservar-ayuda">
                    No quedan horarios libres para {duracion} minutos este día. Prueba otro día u otra profesional.
                  </p>
                ) : (
                  <div className="reservar-horas">
                    {horarios.map((h) => (
                      <button
                        key={h.hora}
                        type="button"
                        className={`reservar-hora ${hora === h.hora ? "activo" : ""}`}
                        onClick={() => setHora(h.hora)}
                        aria-pressed={hora === h.hora}
                      >
                        {h.hora}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {paso === 2 && (
            <>
              <h2 className="reservar-subtitulo">Revisa y confirma</h2>
              <dl className="reservar-confirmacion">
                <div>
                  <dt>Cuándo</dt>
                  <dd>
                    {diaLargo.format(new Date(`${fecha}T00:00`))}, {hora}
                  </dd>
                </div>
                <div>
                  <dt>Con</dt>
                  <dd>
                    {empleado.nombreempleado} {empleado.apellidoempleado}
                  </dd>
                </div>
                <div>
                  <dt>Duración aproximada</dt>
                  <dd>{duracion} minutos</dd>
                </div>
              </dl>
              <p className="reservar-ayuda">
                Tu cita queda pendiente hasta que el spa la confirme. Si necesitas cambiarla,{" "}
                <a href={enlaceWhatsapp("Hola, quiero cambiar mi cita")} target="_blank" rel="noopener noreferrer">
                  escríbenos por WhatsApp
                </a>
                .
              </p>
            </>
          )}
        </section>

        <aside className="reservar-resumen" aria-label="Tu cita">
          <h2 className="reservar-resumen-titulo">Tu cita</h2>
          {elegidos.length === 0 ? (
            <p className="reservar-ayuda">Aún no eliges servicios.</p>
          ) : (
            <ul className="reservar-resumen-lista">
              {elegidos.map((s) => (
                <li key={s._id}>
                  <span>{s.nombreServicio}</span>
                  <span>{pesos.format(s.precioFinal)}</span>
                </li>
              ))}
            </ul>
          )}
          {empleado && paso > 0 && (
            <p className="reservar-resumen-dato">
              Con {empleado.nombreempleado}
              {hora && `, ${diaLargo.format(new Date(`${fecha}T00:00`))} a las ${hora}`}
            </p>
          )}
          <div className="reservar-total">
            <span>Total</span>
            <strong>{pesos.format(total)}</strong>
          </div>
          {duracion > 0 && <p className="reservar-resumen-dato">{duracion} minutos aproximadamente</p>}

          <div className="reservar-acciones">
            {paso > 0 && (
              <button type="button" className="btn btn-secondary" onClick={() => setPaso(paso - 1)}>
                <ChevronLeft size={16} /> Atrás
              </button>
            )}
            {paso < 2 ? (
              <button type="button" className="btn btn-primary" disabled={!puedeSeguir} onClick={() => setPaso(paso + 1)}>
                Continuar
              </button>
            ) : (
              <button type="button" className="btn btn-primary" disabled={guardando} onClick={confirmar}>
                {guardando ? "Reservando…" : "Confirmar cita"}
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
