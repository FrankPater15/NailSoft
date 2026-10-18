"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import axios from "axios"
import Swal from "sweetalert2"
import { useAuth } from "../../context/AuthContext"
import { enlaceWhatsapp } from "../../config/contacto"
import "../../styles/tablas.css"
import "./misCitas.css"

const API = `${import.meta.env.VITE_BACKEND_URL}/api`
const pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
const mes = new Intl.DateTimeFormat("es-CO", { month: "short" })
const diaSemana = new Intl.DateTimeFormat("es-CO", { weekday: "long" })
const fechaCompleta = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" })

const ESTADOS = {
  Pendiente: "pendiente",
  Confirmada: "confirmada",
  "En Progreso": "progreso",
  Completada: "completada",
  Cancelada: "cancelada",
}

const EstadoCita = ({ estado }) => (
  <span className={`estado-cita estado-${ESTADOS[estado] || "pendiente"}`}>
    <span className="esmalte" aria-hidden="true" />
    {estado === "Pendiente" ? "Pendiente de confirmar" : estado}
  </span>
)

const nombresServicios = (cita) => cita.servicios.map((s) => s.nombreServicio).join(", ")

export default function MisCitas() {
  const { user } = useAuth()
  const [citas, setCitas] = useState(null)
  const [ventas, setVentas] = useState([])
  const [error, setError] = useState("")

  const cargar = useCallback(async () => {
    try {
      const [c, v] = await Promise.all([axios.get(`${API}/citas`), axios.get(`${API}/ventas`)])
      setCitas(c.data.citas || [])
      setVentas(v.data.ventas || [])
    } catch {
      setError("No pudimos cargar tus citas. Recarga la página para intentar de nuevo.")
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const { proximas, historial } = useMemo(() => {
    const ahora = new Date()
    const lista = [...(citas || [])].sort((a, b) => new Date(a.fechacita) - new Date(b.fechacita))
    const activa = (c) => ["Pendiente", "Confirmada", "En Progreso"].includes(c.estadocita)
    return {
      proximas: lista.filter((c) => activa(c) && new Date(c.fechacita) >= new Date(ahora.toDateString())),
      historial: lista.filter((c) => !(activa(c) && new Date(c.fechacita) >= new Date(ahora.toDateString()))).reverse(),
    }
  }, [citas])

  const cancelar = async (cita) => {
    const { value: motivo, isConfirmed } = await Swal.fire({
      title: "Cancelar cita",
      text: `${nombresServicios(cita)}, ${diaSemana.format(new Date(cita.fechacita))} a las ${cita.horacita}`,
      input: "textarea",
      inputLabel: "Cuéntanos por qué",
      inputPlaceholder: "Por ejemplo: me surgió un compromiso",
      inputValidator: (valor) => (!valor?.trim() ? "Escribe el motivo para cancelar" : undefined),
      showCancelButton: true,
      confirmButtonText: "Cancelar cita",
      confirmButtonColor: "rgb(var(--c-danger))",
      cancelButtonText: "Mantener cita",
      reverseButtons: true,
    })
    if (!isConfirmed) return
    try {
      await axios.put(`${API}/citas/${cita._id}/cancelar`, { motivo: motivo.trim() })
      Swal.fire({ icon: "success", title: "Cita cancelada", timer: 2000, showConfirmButton: false })
      cargar()
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "No pudimos cancelar la cita",
        text: err.response?.data?.message || "Intenta de nuevo o escríbenos por WhatsApp.",
      })
    }
  }

  const nombre = user?.nombre || localStorage.getItem("userName") || ""

  return (
    <div className="mis-citas">
      <header className="mis-citas-cabecera">
        <div>
          <h1 className="mis-citas-titulo">Hola{nombre && `, ${nombre.split(" ")[0]}`}</h1>
          <p className="mis-citas-bajada">Aquí ves tus citas y tus compras en el spa.</p>
        </div>
        <Link to="/seleccionarservicios" className="btn btn-primary btn-lg">
          Reservar cita
        </Link>
      </header>

      {error && <p className="mis-citas-error">{error}</p>}

      <section aria-labelledby="titulo-proximas">
        <h2 id="titulo-proximas" className="mis-citas-seccion">
          Próximas citas
        </h2>
        {citas === null ? (
          <div className="mis-citas-cargando" aria-busy="true" />
        ) : proximas.length === 0 ? (
          <div className="mis-citas-vacio">
            <p>No tienes citas próximas.</p>
            <Link to="/seleccionarservicios" className="btn btn-secondary">
              Reservar una cita
            </Link>
          </div>
        ) : (
          <ul className="citas-lista">
            {proximas.map((cita) => {
              const fecha = new Date(cita.fechacita)
              return (
                <li key={cita._id} className="cita-tarjeta">
                  <div className="cita-fecha">
                    <span className="cita-dia font-marca">{fecha.getDate()}</span>
                    <span className="cita-mes">{mes.format(fecha).replace(".", "")}</span>
                  </div>
                  <div className="cita-info">
                    <p className="cita-cuando">
                      {diaSemana.format(fecha)}, {cita.horacita}
                    </p>
                    <p className="cita-servicios">{nombresServicios(cita)}</p>
                    <p className="cita-detalle">
                      Con {cita.nombreempleado?.nombreempleado || "el equipo"} · {cita.duracionTotal} min ·{" "}
                      {pesos.format(cita.montototal)}
                    </p>
                    <EstadoCita estado={cita.estadocita} />
                  </div>
                  {cita.estadocita !== "En Progreso" && (
                    <div className="cita-acciones">
                      <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => cancelar(cita)}>
                        Cancelar
                      </button>
                      <a
                        className="btn btn-secondary btn-sm"
                        href={enlaceWhatsapp(`Hola, quiero cambiar mi cita del ${fechaCompleta.format(fecha)} a las ${cita.horacita}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Cambiar hora
                      </a>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {historial.length > 0 && (
        <section aria-labelledby="titulo-historial">
          <h2 id="titulo-historial" className="mis-citas-seccion">
            Historial
          </h2>
          <ul className="historial-lista">
            {historial.map((cita) => (
              <li key={cita._id}>
                <span className="historial-fecha">{fechaCompleta.format(new Date(cita.fechacita))}</span>
                <span className="historial-servicios">{nombresServicios(cita)}</span>
                <EstadoCita estado={cita.estadocita} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {ventas.length > 0 && (
        <section aria-labelledby="titulo-compras">
          <h2 id="titulo-compras" className="mis-citas-seccion">
            Compras
          </h2>
          <div className="tabla-contenedor">
            <table className="universal-tabla-moderna">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Detalle</th>
                  <th>Pago</th>
                  <th style={{ textAlign: "right" }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {ventas.map((v) => (
                  <tr key={v._id}>
                    <td>{fechaCompleta.format(new Date(v.fechaCreacion))}</td>
                    <td>
                      {[...v.servicios.map((s) => s.nombreServicio), ...v.productos.map((p) => `${p.nombreProducto} ×${p.cantidad}`)].join(", ")}
                    </td>
                    <td>{v.estado ? v.metodoPago : "Pendiente"}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{pesos.format(v.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
