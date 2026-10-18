import { Link } from "react-router-dom"
import "./auth.css"

// Marco común de las pantallas de acceso: formulario a la izquierda y panel de marca a la derecha
// con una foto de uñas recortada en forma de uña almendrada.
const FOTO = `${import.meta.env.VITE_BACKEND_URL}/uploads/ImgFdo14.jpg`

export default function AuthShell({ titulo, descripcion, children, pie }) {
  return (
    <div className="auth">
      <main className="auth-lado-form">
        <Link to="/" className="auth-marca" aria-label="NailSoft, volver al inicio">
          <span className="auth-marca-una forma-una" aria-hidden="true" />
          <span className="font-marca">NailSoft</span>
        </Link>

        <div className="auth-form">
          <h1 className="auth-titulo">{titulo}</h1>
          {descripcion && <p className="auth-descripcion">{descripcion}</p>}
          {children}
          {pie && <div className="auth-pie">{pie}</div>}
        </div>

        <p className="auth-legal">S&amp;B Spa y Belleza</p>
      </main>

      <aside className="auth-lado-marca" aria-hidden="true">
        <p className="auth-lema font-marca">
          Manos cuidadas,
          <br />
          agenda en orden.
        </p>
        <div className="auth-foto forma-una">
          <img src={FOTO} alt="" loading="eager" />
        </div>
        <span className="auth-esmalte forma-una" />
      </aside>
    </div>
  )
}

// Campo con etiqueta visible arriba (más claro que las etiquetas flotantes)
export function AuthCampo({ id, etiqueta, ayuda, error, children }) {
  return (
    <div className="auth-campo">
      <label htmlFor={id}>{etiqueta}</label>
      {children}
      {error ? (
        <p className="auth-campo-error" role="alert">
          {error}
        </p>
      ) : (
        ayuda && <p className="auth-campo-ayuda">{ayuda}</p>
      )}
    </div>
  )
}
