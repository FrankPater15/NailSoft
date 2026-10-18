"use client"

import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import axios from "axios"
import AuthShell, { AuthCampo } from "../AuthShell"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const enviar = async (e) => {
    e.preventDefault()
    const correo = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      setError("Revisa el formato del correo, por ejemplo nombre@correo.com")
      return
    }
    setLoading(true)
    setError("")
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/request-password-reset`, { email: correo })
      localStorage.setItem("recoveryEmail", correo)
      navigate("/verify-token", { state: { email: correo } })
    } catch (err) {
      setError(err.response?.data?.message || "No pudimos enviar el código. Intenta de nuevo en unos minutos.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      titulo="Recupera tu contraseña"
      descripcion="Te enviaremos un código de 6 dígitos a tu correo para que puedas crear una contraseña nueva."
      pie={<Link to="/login">Volver a iniciar sesión</Link>}
    >
      {error && (
        <div className="auth-alerta" role="alert">
          {error}
        </div>
      )}
      <form onSubmit={enviar}>
        <AuthCampo id="email" etiqueta="Correo de tu cuenta">
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </AuthCampo>
        <button className="auth-boton" type="submit" disabled={loading}>
          {loading ? <span className="auth-cargando" aria-label="Enviando" /> : "Enviar código"}
        </button>
      </form>
    </AuthShell>
  )
}
