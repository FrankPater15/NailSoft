import { useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import Modal from "react-modal"
import Swal from "sweetalert2"
import dayjs from "dayjs"
import { X } from "lucide-react"
import { usePermissions } from "../../hooks/usePermissions"
import { claseEstado, etiquetaEstado, nombreCliente, nombreEmpleado, pesos } from "./agendaComun"

const API = `${import.meta.env.VITE_BACKEND_URL}/api`
const ACTUALIZAR = ["actualizarCitas", "actualizarCitasPropias"]
const CANCELAR = ["actualizarCitas", "actualizarCitasPropias", "cancelarCitasPropias"]
const VENTAS = ["crearVentas", "actualizarVentas", "actualizarVentasPropias"]

Modal.setAppElement("#root")

// Panel lateral con el detalle de una cita y las acciones que permite su estado
export default function DetalleCita({ cita, onCerrar, onEditar, onCambio }) {
  const navigate = useNavigate()
  const { hasPermission } = usePermissions()
  const [ocupado, setOcupado] = useState(false)

  const ejecutar = async (accion) => {
    setOcupado(true)
    try {
      await accion()
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "No se pudo completar la acción",
        text: err.response?.data?.message || err.response?.data?.msg || "Intenta de nuevo.",
      })
    } finally {
      setOcupado(false)
    }
  }

  const confirmar = () =>
    ejecutar(async () => {
      await axios.put(`${API}/citas/${cita._id}`, { estadocita: "Confirmada" })
      onCambio()
    })

  const iniciar = () =>
    ejecutar(async () => {
      await axios.put(`${API}/citas/${cita._id}/iniciar`)
      navigate(`/gestion-venta/new/${cita._id}`)
    })

  const abrirVenta = () =>
    ejecutar(async () => {
      const { data } = await axios.get(`${API}/ventas/cita/${cita._id}`)
      navigate(data[0] ? `/gestion-venta/${data[0]._id}` : `/gestion-venta/new/${cita._id}`)
    })

  const cancelar = async () => {
    const { value: motivo, isConfirmed } = await Swal.fire({
      title: `Cancelar la cita de ${nombreCliente(cita)}`,
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
    ejecutar(async () => {
      await axios.put(`${API}/citas/${cita._id}/cancelar`, { motivo: motivo.trim() })
      onCambio()
    })
  }

  const estado = cita?.estadocita
  const abierta = estado === "Pendiente" || estado === "Confirmada"
  const puedeActualizar = hasPermission(ACTUALIZAR)

  return (
    <Modal
      isOpen={Boolean(cita)}
      onRequestClose={onCerrar}
      className="detalle-cita"
      overlayClassName="detalle-cita-fondo"
      contentLabel="Detalle de la cita"
      closeTimeoutMS={150}
    >
      {cita && (
        <>
          <header className="detalle-cita-cabecera">
            <span className={`detalle-cita-estado estado-${claseEstado(estado)}`}>
              <span className="esmalte" aria-hidden="true" />
              {etiquetaEstado(estado)}
            </span>
            <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <h2 className="detalle-cita-cliente">{nombreCliente(cita)}</h2>
          <p className="detalle-cita-cuando">
            {dayjs(cita.fechacita).format("dddd D [de] MMMM")}, {cita.horacita}
          </p>

          <dl className="detalle-cita-datos">
            <div>
              <dt>Atiende</dt>
              <dd>{nombreEmpleado(cita)}</dd>
            </div>
            <div>
              <dt>Duración</dt>
              <dd>{cita.duracionTotal || 60} min</dd>
            </div>
          </dl>

          <h3 className="detalle-cita-subtitulo">Servicios</h3>
          <ul className="detalle-cita-servicios">
            {(cita.servicios || []).map((s) => (
              <li key={s._id || s.servicio}>
                <span>
                  {s.nombreServicio}
                  <small>{s.tiempo} min</small>
                </span>
                <span>{pesos.format(s.precio || 0)}</span>
              </li>
            ))}
            <li className="detalle-cita-total">
              <span>Total</span>
              <span>{pesos.format(cita.montototal || 0)}</span>
            </li>
          </ul>

          {estado === "Cancelada" && cita.motivo && (
            <p className="detalle-cita-motivo">
              <strong>Motivo de cancelación:</strong> {cita.motivo}
            </p>
          )}

          <footer className="detalle-cita-acciones">
            {estado === "Pendiente" && puedeActualizar && (
              <button className="btn btn-primary" disabled={ocupado} onClick={confirmar}>
                Confirmar cita
              </button>
            )}
            {estado === "Confirmada" && puedeActualizar && (
              <button className="btn btn-primary" disabled={ocupado} onClick={iniciar}>
                Iniciar atención
              </button>
            )}
            {(estado === "En Progreso" || estado === "Completada") && hasPermission(VENTAS) && (
              <button className="btn btn-primary" disabled={ocupado} onClick={abrirVenta}>
                {estado === "En Progreso" ? "Registrar venta" : "Ver venta"}
              </button>
            )}
            {abierta && puedeActualizar && (
              <button className="btn btn-secondary" disabled={ocupado} onClick={() => onEditar(cita)}>
                Editar
              </button>
            )}
            {abierta && hasPermission(CANCELAR) && (
              <button className="btn btn-outline-danger" disabled={ocupado} onClick={cancelar}>
                Cancelar cita
              </button>
            )}
          </footer>
        </>
      )}
    </Modal>
  )
}
