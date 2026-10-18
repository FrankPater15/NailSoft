"use client"

import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import axios from "axios"
import Swal from "sweetalert2"
import { useAuth } from "../../context/AuthContext"
import AuthShell, { AuthCampo } from "./AuthShell"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/login`, { email, password })
      const { token, role, permisos, user } = response.data

      if (!token || !role || !user) {
        throw new Error("Token, role, or user missing from response")
      }

      login({
        token,
        role,
        _id: user.id || user._id,
        nombre: user.name || user.nombre,
        correo: user.email || user.correo,
        permisos: permisos || [],
      })

      navigate(role.toLowerCase() !== "cliente" ? "/dashboard" : "/")
    } catch (error) {
      if (error.response?.data?.cuentaInactiva) {
        Swal.fire({
          icon: "error",
          title: "Cuenta inactiva",
          text: "Tu cuenta está desactivada. Pide al administrador del spa que la active.",
          confirmButtonText: "Entendido",
        })
      } else if (error.response?.data?.rolDesactivado) {
        Swal.fire({
          icon: "error",
          title: "Acceso desactivado",
          text: "Tu rol está desactivado. Pide al administrador del spa que lo active.",
          confirmButtonText: "Entendido",
        })
      } else if (error.response?.status === 429) {
        setError(error.response.data.message)
      } else {
        setError("El correo o la contraseña no coinciden. Revísalos e intenta de nuevo.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      titulo="Inicia sesión"
      descripcion="Entra para reservar tus citas o, si eres del equipo, gestionar el día del spa."
      pie={
        <>
          <Link to="/forgot-password">Olvidé mi contraseña</Link>
          <span>
            ¿Primera vez? <Link to="/register">Crea tu cuenta</Link>
          </span>
        </>
      }
    >
      {error && (
        <div className="auth-alerta" role="alert">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} noValidate={false}>
        <AuthCampo id="email" etiqueta="Correo electrónico">
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </AuthCampo>

        <AuthCampo id="password" etiqueta="Contraseña">
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </AuthCampo>

        <button className="auth-boton" type="submit" disabled={loading}>
          {loading ? <span className="auth-cargando" aria-label="Entrando" /> : "Iniciar sesión"}
        </button>
      </form>
    </AuthShell>
  )
}
