"use client"

import { Link } from "react-router-dom"
import { FaInstagram, FaWhatsapp } from "react-icons/fa"
import { useLayoutType } from "../../hooks/useLayoutType"
import { CONTACTO, enlaceInstagram, enlaceWhatsapp } from "../../config/contacto"
import "./footer.css"

const Footer = () => {
  const { shouldShowSidebar } = useLayoutType()

  // El panel administrativo no lleva pie de página
  if (shouldShowSidebar) return null

  return (
    <footer className="pie">
      <div className="pie-interior">
        <div className="pie-marca">
          <Link to="/" className="pie-logo font-marca">
            NailSoft
          </Link>
          <p>{CONTACTO.nombre}. Manicure, pedicure y uñas esculpidas con cita.</p>
        </div>

        <nav className="pie-columna" aria-label="Enlaces">
          <Link to="/#servicios">Servicios y precios</Link>
          <Link to="/seleccionarservicios">Reservar cita</Link>
          <Link to="/politicas">Políticas del spa</Link>
        </nav>

        <div className="pie-columna">
          <a href={enlaceWhatsapp()} target="_blank" rel="noopener noreferrer">
            <FaWhatsapp aria-hidden="true" /> WhatsApp
          </a>
          <a href={enlaceInstagram()} target="_blank" rel="noopener noreferrer">
            <FaInstagram aria-hidden="true" /> @{CONTACTO.instagram}
          </a>
        </div>
      </div>
      <p className="pie-legal">© {new Date().getFullYear()} {CONTACTO.nombre}</p>
    </footer>
  )
}

export default Footer
