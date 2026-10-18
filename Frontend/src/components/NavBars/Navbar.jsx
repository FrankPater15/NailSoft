"use client"

import { useState, useEffect, useRef } from "react"
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom"
import { Menu, X, LogOut, User } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { useLayoutType } from "../../hooks/useLayoutType"
import ThemeToggle from "../ThemeToggle"
import "./navbar.css"

// Barra de la parte pública y del cliente (el personal usa el panel con menú lateral)
export default function MainNavbar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const { shouldShowSidebar } = useLayoutType()
  const [abierto, setAbierto] = useState(false)
  const [menuUsuario, setMenuUsuario] = useState(false)
  const usuarioRef = useRef(null)

  // Cierra los menús al navegar
  useEffect(() => {
    setAbierto(false)
    setMenuUsuario(false)
  }, [pathname])

  useEffect(() => {
    if (!menuUsuario) return
    const fuera = (e) => usuarioRef.current && !usuarioRef.current.contains(e.target) && setMenuUsuario(false)
    document.addEventListener("mousedown", fuera)
    return () => document.removeEventListener("mousedown", fuera)
  }, [menuUsuario])

  if (shouldShowSidebar) return null

  const nombre = user?.nombre || localStorage.getItem("userName") || ""
  const enlaces = user
    ? [
        ["/articles", "Servicios"],
        ["/mi-cuenta", "Mis citas"],
        ["/politicas", "Políticas"],
      ]
    : [["/#servicios", "Servicios"]]

  const salir = () => {
    logout()
    navigate("/")
  }

  return (
    <header className="nav-publica">
      <div className="nav-publica-interior">
        <Link to="/" className="nav-marca" aria-label="NailSoft, inicio">
          <span className="nav-marca-una forma-una" aria-hidden="true" />
          <span className="font-marca">NailSoft</span>
        </Link>

        <nav className={`nav-enlaces ${abierto ? "abierto" : ""}`} aria-label="Principal">
          {enlaces.map(([ruta, texto]) =>
            ruta.includes("#") ? (
              <a key={ruta} href={ruta} className="nav-enlace">
                {texto}
              </a>
            ) : (
              <NavLink key={ruta} to={ruta} className="nav-enlace">
                {texto}
              </NavLink>
            ),
          )}

          <div className="nav-acciones">
            <ThemeToggle />
            {user ? (
              <>
                <Link to="/seleccionarservicios" className="btn btn-primary">
                  Reservar cita
                </Link>
                <div className="nav-usuario" ref={usuarioRef}>
                  <button
                    className="nav-usuario-boton"
                    onClick={() => setMenuUsuario((v) => !v)}
                    aria-expanded={menuUsuario}
                    aria-haspopup="menu"
                    aria-label={`Cuenta de ${nombre}`}
                  >
                    {nombre.charAt(0).toUpperCase() || <User size={16} />}
                  </button>
                  {menuUsuario && (
                    <div className="nav-usuario-menu" role="menu">
                      <p className="nav-usuario-nombre">{nombre}</p>
                      <Link to="/profile" role="menuitem">
                        <User size={16} aria-hidden="true" /> Mi perfil
                      </Link>
                      <button role="menuitem" onClick={salir}>
                        <LogOut size={16} aria-hidden="true" /> Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-enlace">
                  Iniciar sesión
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Reservar cita
                </Link>
              </>
            )}
          </div>
        </nav>

        <button
          className="nav-menu-movil boton-icono"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-label={abierto ? "Cerrar menú" : "Abrir menú"}
        >
          {abierto ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
    </header>
  )
}
