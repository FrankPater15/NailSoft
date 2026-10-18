"use client"

import { useState, useRef, useEffect } from "react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import axios from "axios"
import AuthShell from "../AuthShell"

const API = `${import.meta.env.VITE_BACKEND_URL}/api/auth`
const VACIO = ["", "", "", "", "", ""]

export default function VerifyToken() {
  const location = useLocation()
  const navigate = useNavigate()
  const email = location.state?.email || localStorage.getItem("recoveryEmail") || ""
  const [digitos, setDigitos] = useState(VACIO)
  const [error, setError] = useState("")
  const [aviso, setAviso] = useState("")
  const [loading, setLoading] = useState(false)
  const inputs = useRef([])

  // Sin correo no hay a quién verificar
  useEffect(() => {
    if (!email) navigate("/forgot-password", { replace: true })
  }, [email, navigate])

  const escribir = (i, valor) => {
    const limpio = valor.replace(/\D/g, "")
    if (limpio.length > 1) {
      // Pegó el código completo
      const nuevos = limpio.slice(0, 6).split("")
      setDigitos([...nuevos, ...VACIO].slice(0, 6))
      inputs.current[Math.min(nuevos.length, 5)]?.focus()
      return
    }
    const nuevos = [...digitos]
    nuevos[i] = limpio
    setDigitos(nuevos)
    setError("")
    if (limpio && i < 5) inputs.current[i + 1]?.focus()
  }

  const tecla = (i, e) => {
    if (e.key === "Backspace" && !digitos[i] && i > 0) inputs.current[i - 1]?.focus()
  }

  const verificar = async (e) => {
    e.preventDefault()
    const codigo = digitos.join("")
    if (codigo.length !== 6) {
      setError("Escribe los 6 dígitos del código")
      return
    }
    setLoading(true)
    setError("")
    try {
      const { data } = await axios.post(`${API}/verify-reset-token`, { token: codigo, email })
      localStorage.setItem("resetToken", data.resetToken)
      localStorage.setItem("recoveryEmail", email)
      navigate("/reset-password", { state: { resetToken: data.resetToken, email } })
    } catch (err) {
      setError(err.response?.data?.message || "No pudimos verificar el código. Intenta de nuevo.")
      if (err.response?.data?.expired) setDigitos(VACIO)
    } finally {
      setLoading(false)
    }
  }

  const reenviar = async () => {
    setAviso("")
    setError("")
    try {
      await axios.post(`${API}/request-password-reset`, { email })
      setDigitos(VACIO)
      setAviso("Te enviamos un código nuevo.")
      inputs.current[0]?.focus()
    } catch (err) {
      setError(err.response?.data?.message || "No pudimos reenviar el código.")
    }
  }

  return (
    <AuthShell
      titulo="Revisa tu correo"
      descripcion={`Escribe el código de 6 dígitos que enviamos a ${email}. Vence en 15 minutos.`}
      pie={
        <>
          <button type="button" className="auth-enlace" onClick={reenviar}>
            Enviar otro código
          </button>
          <Link to="/forgot-password">Usar otro correo</Link>
        </>
      }
    >
      {error && (
        <div className="auth-alerta" role="alert">
          {error}
        </div>
      )}
      {aviso && (
        <div className="auth-alerta exito" role="status">
          {aviso}
        </div>
      )}
      <form onSubmit={verificar}>
        <div className="auth-codigo" role="group" aria-label="Código de verificación">
          {digitos.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputs.current[i] = el)}
              value={d}
              onChange={(e) => escribir(i, e.target.value)}
              onKeyDown={(e) => tecla(i, e)}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              aria-label={`Dígito ${i + 1}`}
              maxLength={6}
            />
          ))}
        </div>
        <button className="auth-boton" type="submit" disabled={loading}>
          {loading ? <span className="auth-cargando" aria-label="Verificando" /> : "Verificar código"}
        </button>
      </form>
    </AuthShell>
  )
}
