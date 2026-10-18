"use client"

import { useState, useEffect } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import axios from "axios"
import Swal from "sweetalert2"
import AuthShell, { AuthCampo } from "../AuthShell"

const validarPassword = (valor) => {
  if (valor.length < 8) return "Debe tener al menos 8 caracteres"
  if (!/[A-Z]/.test(valor)) return "Agrega una letra mayúscula"
  if (!/[a-z]/.test(valor)) return "Agrega una letra minúscula"
  if (!/[0-9]/.test(valor)) return "Agrega un número"
  if (!/[^A-Za-z0-9]/.test(valor)) return "Agrega un símbolo, por ejemplo ! o #"
  return ""
}

export default function ResetPassword() {
  const location = useLocation()
  const navigate = useNavigate()
  const resetToken = location.state?.resetToken || localStorage.getItem("resetToken") || ""
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [errores, setErrores] = useState({})
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Sin autorización hay que verificar el código primero
  useEffect(() => {
    if (!resetToken) navigate("/forgot-password", { replace: true })
  }, [resetToken, navigate])

  const guardar = async (e) => {
    e.preventDefault()
    const nuevos = {
      password: validarPassword(password),
      confirmPassword: confirmPassword !== password ? "Las contraseñas no coinciden" : "",
    }
    setErrores(nuevos)
    if (nuevos.password || nuevos.confirmPassword) return

    setLoading(true)
    setError("")
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/auth/reset-password`, {
        token: resetToken,
        password,
        confirmPassword,
      })
      localStorage.removeItem("recoveryEmail")
      localStorage.removeItem("resetToken")
      await Swal.fire({
        icon: "success",
        title: "Contraseña actualizada",
        text: "Ya puedes iniciar sesión con tu contraseña nueva.",
        confirmButtonText: "Iniciar sesión",
      })
      navigate("/login")
    } catch (err) {
      if (err.response?.data?.expired || err.response?.data?.invalid) {
        localStorage.removeItem("resetToken")
        setError("La autorización venció. Pide un código nuevo para continuar.")
      } else {
        setError(err.response?.data?.message || "No pudimos cambiar la contraseña. Intenta de nuevo.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      titulo="Crea una contraseña nueva"
      descripcion="Usa al menos 8 caracteres, con mayúscula, minúscula, número y símbolo."
      pie={<Link to="/forgot-password">Pedir otro código</Link>}
    >
      {error && (
        <div className="auth-alerta" role="alert">
          {error}
        </div>
      )}
      <form onSubmit={guardar} noValidate>
        <AuthCampo id="password" etiqueta="Contraseña nueva" error={errores.password}>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(errores.password)}
            required
          />
        </AuthCampo>
        <AuthCampo id="confirmPassword" etiqueta="Repite la contraseña" error={errores.confirmPassword}>
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            aria-invalid={Boolean(errores.confirmPassword)}
            required
          />
        </AuthCampo>
        <button className="auth-boton" type="submit" disabled={loading}>
          {loading ? <span className="auth-cargando" aria-label="Guardando" /> : "Guardar contraseña"}
        </button>
      </form>
    </AuthShell>
  )
}
