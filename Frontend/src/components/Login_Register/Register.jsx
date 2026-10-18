"use client"

import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import axios from "axios"
import { useAuth } from "../../context/AuthContext"
import AuthShell, { AuthCampo } from "./AuthShell"

const API = `${import.meta.env.VITE_BACKEND_URL}/api/auth`

const SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s'-]+$/

const validarNombre = (valor, campo) => {
  if (!valor.trim()) return `Escribe tu ${campo}`
  if (!SOLO_LETRAS.test(valor)) return "Usa solo letras y espacios"
  if (valor.trim().length < 3) return "Debe tener al menos 3 letras"
  if (valor.length > 20) return "Máximo 20 caracteres"
  return ""
}

// Mensaje de error de cada campo (vacío si es válido)
const validarCampo = (nombre, valor, datos) => {
  switch (nombre) {
    case "nombre":
      return validarNombre(valor, "nombre")
    case "apellido":
      return validarNombre(valor, "apellido")
    case "email":
      if (!valor.trim()) return "Escribe tu correo"
      if (/\s/.test(valor)) return "El correo no puede tener espacios"
      if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(valor)) return "Revisa el formato, por ejemplo nombre@correo.com"
      if (valor.length > 80) return "Máximo 80 caracteres"
      return ""
    case "celular":
      if (!valor.trim()) return "Escribe tu celular"
      if (!/^[0-9]+$/.test(valor)) return "Usa solo números"
      if (valor.length !== 10) return "Debe tener 10 dígitos"
      if (valor.startsWith("0")) return "No puede empezar por 0"
      return ""
    case "password":
      if (!valor) return "Crea una contraseña"
      if (valor.length < 8) return "Debe tener al menos 8 caracteres"
      if (valor.length > 64) return "Máximo 64 caracteres"
      if (/\s/.test(valor)) return "No puede tener espacios"
      if (!/[A-Z]/.test(valor)) return "Agrega una letra mayúscula"
      if (!/[a-z]/.test(valor)) return "Agrega una letra minúscula"
      if (!/[0-9]/.test(valor)) return "Agrega un número"
      if (!/[^A-Za-z0-9]/.test(valor)) return "Agrega un símbolo, por ejemplo ! o #"
      return ""
    case "confirmPassword":
      if (!valor) return "Repite la contraseña"
      if (valor !== datos.password) return "Las contraseñas no coinciden"
      return ""
    default:
      return ""
  }
}

const CAMPOS = ["nombre", "apellido", "email", "celular", "password", "confirmPassword"]

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [datos, setDatos] = useState(Object.fromEntries(CAMPOS.map((c) => [c, ""])))
  const [errores, setErrores] = useState({})
  const [tocados, setTocados] = useState({})
  const [errorGeneral, setErrorGeneral] = useState("")
  const [loading, setLoading] = useState(false)

  const cambiar = (e) => {
    const { name, value } = e.target
    const valor = name === "email" ? value.toLowerCase() : value
    const nuevos = { ...datos, [name]: valor }
    setDatos(nuevos)
    setErrores((prev) => ({
      ...prev,
      [name]: validarCampo(name, valor, nuevos),
      // Si cambia la contraseña, revalida la confirmación
      ...(name === "password" && nuevos.confirmPassword && {
        confirmPassword: validarCampo("confirmPassword", nuevos.confirmPassword, nuevos),
      }),
    }))
    setErrorGeneral("")
  }

  const salir = (e) => setTocados((prev) => ({ ...prev, [e.target.name]: true }))

  const registrar = async (e) => {
    e.preventDefault()
    const todos = Object.fromEntries(CAMPOS.map((c) => [c, validarCampo(c, datos[c], datos)]))
    setErrores(todos)
    setTocados(Object.fromEntries(CAMPOS.map((c) => [c, true])))
    if (Object.values(todos).some(Boolean)) return

    setLoading(true)
    setErrorGeneral("")
    try {
      await axios.post(`${API}/register`, {
        nombre: datos.nombre.trim(),
        apellido: datos.apellido.trim(),
        email: datos.email.trim(),
        celular: datos.celular.trim(),
        password: datos.password,
        confirmPassword: datos.confirmPassword,
      })
      // Inicia sesión para tener la sesión completa (id y permisos del rol)
      const { data } = await axios.post(`${API}/login`, { email: datos.email.trim(), password: datos.password })
      login({
        token: data.token,
        role: data.role,
        _id: data.user.id,
        nombre: data.user.name,
        correo: data.user.email,
        permisos: data.permisos || [],
      })
      navigate("/")
    } catch (error) {
      const mensaje = error.response?.data?.message || error.response?.data?.msg
      setErrorGeneral(
        error.request && !error.response
          ? "No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo."
          : mensaje || "No pudimos crear la cuenta. Intenta de nuevo.",
      )
    } finally {
      setLoading(false)
    }
  }

  const error = (campo) => (tocados[campo] ? errores[campo] : "")
  const campo = (nombre, props) => (
    <input
      id={nombre}
      name={nombre}
      value={datos[nombre]}
      onChange={cambiar}
      onBlur={salir}
      aria-invalid={Boolean(error(nombre))}
      required
      {...props}
    />
  )

  return (
    <AuthShell
      titulo="Crea tu cuenta"
      descripcion="Con tu cuenta reservas citas y ves el historial de tus servicios."
      pie={
        <span>
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </span>
      }
    >
      {errorGeneral && (
        <div className="auth-alerta" role="alert">
          {errorGeneral}
        </div>
      )}

      <form onSubmit={registrar} noValidate>
        <div className="auth-fila">
          <AuthCampo id="nombre" etiqueta="Nombre" error={error("nombre")}>
            {campo("nombre", { autoComplete: "given-name", maxLength: 20 })}
          </AuthCampo>
          <AuthCampo id="apellido" etiqueta="Apellido" error={error("apellido")}>
            {campo("apellido", { autoComplete: "family-name", maxLength: 20 })}
          </AuthCampo>
        </div>
        <AuthCampo id="email" etiqueta="Correo electrónico" error={error("email")}>
          {campo("email", { type: "email", autoComplete: "email", maxLength: 80 })}
        </AuthCampo>
        <AuthCampo id="celular" etiqueta="Celular" error={error("celular")} ayuda="10 dígitos, sin espacios">
          {campo("celular", { type: "tel", inputMode: "numeric", autoComplete: "tel-national", maxLength: 10 })}
        </AuthCampo>
        <AuthCampo
          id="password"
          etiqueta="Contraseña"
          error={error("password")}
          ayuda="Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo"
        >
          {campo("password", { type: "password", autoComplete: "new-password" })}
        </AuthCampo>
        <AuthCampo id="confirmPassword" etiqueta="Repite la contraseña" error={error("confirmPassword")}>
          {campo("confirmPassword", { type: "password", autoComplete: "new-password" })}
        </AuthCampo>

        <button className="auth-boton" type="submit" disabled={loading}>
          {loading ? <span className="auth-cargando" aria-label="Creando cuenta" /> : "Crear cuenta"}
        </button>
      </form>
    </AuthShell>
  )
}
