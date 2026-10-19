"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import axios from "axios"
import Swal from "sweetalert2"
import { RefreshCw } from "lucide-react"
import "../../styles/tablas.css"
import "./enAtencion.css"

const API = `${import.meta.env.VITE_BACKEND_URL}/api`
const pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
const hoyLargo = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" })

const esHoy = (fecha) => new Date(fecha).toDateString() === new Date().toDateString()
const ESTADO_CLASE = { Pendiente: "pendiente", Confirmada: "confirmada", "En Progreso": "progreso" }

// Citas de hoy para el personal: quién está en atención y quién sigue
export default function EnAtencion() {
  const navigate = useNavigate()
  const [citas, setCitas] = useState(null)
  const [ocupada, setOcupada] = useState("")

  const cargar = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API}/citas`)
      setCitas((data.citas || []).filter((c) => esHoy(c.fechacita)))
    } catch {
      setCitas([])
      Swal.fire({ icon: "error", title: "No pudimos cargar las citas de hoy" })
    }
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  const { enAtencion, porAtender } = useMemo(() => {
    const porHora = (a, b) => a.horacita.localeCompare(b.horacita)
    const lista = citas || []
    return {
      enAtencion: lista.filter((c) => c.estadocita === "En Progreso").sort(porHora),
      porAtender: lista.filter((c) => ["Pendiente", "Confirmada"].includes(c.estadocita)).sort(porHora),
    }
  }, [citas])

  const accion = async (cita, ejecutar) => {
    setOcupada(cita._id)
    try {
      await ejecutar()
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "No se pudo completar la acción",
        text: err.response?.data?.message || err.response?.data?.msg || "Intenta de nuevo.",
      })
    } finally {
      setOcupada("")
    }
  }

  const confirmar = (cita) =>
    accion(cita, async () => {
      await axios.put(`${API}/citas/${cita._id}`, { estadocita: "Confirmada" })
      await cargar()
    })

  const iniciar = (cita) =>
    accion(cita, async () => {
      await axios.put(`${API}/citas/${cita._id}/iniciar`)
      navigate(`/gestion-venta/new/${cita._id}`)
    })

  // Abre la venta de la cita si ya existe; si no, crea una nueva
  const registrarVenta = (cita) =>
    accion(cita, async () => {
      const { data } = await axios.get(`${API}/ventas/cita/${cita._id}`)
      navigate(data[0] ? `/gestion-venta/${data[0]._id}` : `/gestion-venta/new/${cita._id}`)
    })

  const cancelar = async (cita) => {
    const { value: motivo, isConfirmed } = await Swal.fire({
      title: `Cancelar la cita de ${cita.nombrecliente?.nombrecliente || "la clienta"}`,
      input: "textarea",
      inputLabel: "Motivo",
      inputValidator: (v) => (!v?.trim() ? "Escribe el motivo" : undefined),
      showCancelButton: true,
      confirmButtonText: "Cancelar cita",
      confirmButtonColor: "rgb(var(--c-danger))",
      cancelButtonText: "Volver",
      reverseButtons: true,
    })
    if (!isConfirmed) return
    accion(cita, async () => {
      await axios.put(`${API}/citas/${cita._id}/cancelar`, { motivo: motivo.trim() })
      await cargar()
    })
  }

  const tarjeta = (cita) => {
    const ocupado = ocupada === cita._id
    return (
      <li key={cita._id} className={`atencion-tarjeta estado-${ESTADO_CLASE[cita.estadocita]}`}>
        <div className="atencion-hora">{cita.horacita}</div>
        <div className="atencion-info">
          <p className="atencion-cliente">{cita.nombrecliente?.nombrecliente || "Clienta sin nombre"}</p>
          <p className="atencion-servicios">{cita.servicios.map((s) => s.nombreServicio).join(", ")}</p>
          <p className="atencion-detalle">
            Con {cita.nombreempleado?.nombreempleado || "sin asignar"} · {cita.duracionTotal} min ·{" "}
            {pesos.format(cita.montototal)}
          </p>
          <span className="atencion-estado">
            <span className="esmalte" aria-hidden="true" />
            {cita.estadocita === "Pendiente" ? "Pendiente de confirmar" : cita.estadocita}
          </span>
        </div>
        <div className="atencion-acciones">
          {cita.estadocita === "Pendiente" && (
            <button className="btn btn-primary btn-sm" disabled={ocupado} onClick={() => confirmar(cita)}>
              Confirmar
            </button>
          )}
          {cita.estadocita === "Confirmada" && (
            <button className="btn btn-primary btn-sm" disabled={ocupado} onClick={() => iniciar(cita)}>
              Iniciar atención
            </button>
          )}
          {cita.estadocita === "En Progreso" && (
            <button className="btn btn-primary btn-sm" disabled={ocupado} onClick={() => registrarVenta(cita)}>
              Registrar venta
            </button>
          )}
          {cita.estadocita !== "En Progreso" && (
            <button className="btn btn-outline-danger btn-sm" disabled={ocupado} onClick={() => cancelar(cita)}>
              Cancelar
            </button>
          )}
        </div>
      </li>
    )
  }

  return (
    <div className="atencion">
      <div className="pagina-acciones">
        <div>
          <h1 className="pagina-titulo" style={{ margin: 0 }}>
            Citas de hoy
          </h1>
          <p className="atencion-fecha">{hoyLargo.format(new Date())}</p>
        </div>
        <button className="btn btn-secondary" onClick={cargar}>
          <RefreshCw size={16} aria-hidden="true" /> Actualizar
        </button>
      </div>

      {citas === null ? (
        <div className="atencion-cargando" aria-busy="true" />
      ) : (
        <>
          <section aria-labelledby="t-en-atencion">
            <h2 id="t-en-atencion" className="atencion-seccion">
              En atención ahora <span>{enAtencion.length}</span>
            </h2>
            {enAtencion.length === 0 ? (
              <p className="atencion-vacio">Nadie está en atención en este momento.</p>
            ) : (
              <ul className="atencion-lista">{enAtencion.map(tarjeta)}</ul>
            )}
          </section>

          <section aria-labelledby="t-por-atender">
            <h2 id="t-por-atender" className="atencion-seccion">
              Por atender hoy <span>{porAtender.length}</span>
            </h2>
            {porAtender.length === 0 ? (
              <p className="atencion-vacio">
                No quedan citas para hoy. Revisa los próximos días en el <Link to="/citas">calendario</Link>.
              </p>
            ) : (
              <ul className="atencion-lista">{porAtender.map(tarjeta)}</ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
