"use client"

import { useState, useEffect, useRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { ChevronDown, LogOut, Settings, User } from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { usePermissions } from "../../hooks/usePermissions"
import { useLayoutType } from "../../hooks/useLayoutType"
import { useSidebar } from "../Sidebar/Sidebar"
import { menuConfig } from "../../config/menuConfig"
import ThemeToggle from "../ThemeToggle"
import "./dashboardNavBar.css"

// Avatares que el usuario puede elegir en su perfil
const avatarOptions = {
  avatar1:
    "https://avataaars.io/?avatarStyle=Circle&topType=LongHairStraight&accessoriesType=Blank&hairColor=BrownDark&facialHairType=Blank&clotheType=BlazerShirt&eyeType=Default&eyebrowType=Default&mouthType=Default&skinColor=Light",
  avatar2:
    "https://avataaars.io/?avatarStyle=Circle&topType=ShortHairShortRound&accessoriesType=Blank&hairColor=Black&facialHairType=Blank&clotheType=GraphicShirt&clotheColor=Pink&graphicType=Bat&eyeType=Happy&eyebrowType=Default&mouthType=Smile&skinColor=Light",
  avatar3:
    "https://avataaars.io/?avatarStyle=Circle&topType=ShortHairDreads01&accessoriesType=Blank&hairColor=Black&facialHairType=BeardLight&facialHairColor=Black&clotheType=Hoodie&clotheColor=Blue03&eyeType=Default&eyebrowType=Default&mouthType=Default&skinColor=Brown",
  avatar4:
    "https://avataaars.io/?avatarStyle=Circle&topType=ShortHairShortWaved&accessoriesType=Prescription02&hairColor=BlondeGolden&facialHairType=MoustacheFancy&facialHairColor=BrownDark&clotheType=BlazerSweater&eyeType=Default&eyebrowType=RaisedExcited&mouthType=Default&skinColor=Pale",
  avatar5:
    "https://avataaars.io/?avatarStyle=Circle&topType=LongHairCurly&accessoriesType=Blank&hairColor=Red&facialHairType=Blank&clotheType=ShirtVNeck&clotheColor=PastelRed&eyeType=Surprised&eyebrowType=RaisedExcited&mouthType=Smile&skinColor=Tanned",
  avatar6:
    "https://avataaars.io/?avatarStyle=Circle&topType=ShortHairTheCaesar&accessoriesType=Sunglasses&hairColor=Black&facialHairType=BeardMedium&facialHairColor=Black&clotheType=ShirtScoopNeck&clotheColor=Gray01&eyeType=Default&eyebrowType=Default&mouthType=Default&skinColor=Brown",
}

// Pantallas que no están en el menú lateral
const TITULOS_EXTRA = [
  [/^\/profile/, "Mi perfil"],
  [/^\/gestion-venta/, "Venta de la cita"],
  [/^\/politicas/, "Políticas"],
  [/^\/seleccionarservicios/, "Agendar cita"],
]

const tituloDe = (ruta) => {
  const item = menuConfig.find((m) => m.path === ruta)
  if (item) return { seccion: item.group, titulo: item.label }
  const extra = TITULOS_EXTRA.find(([patron]) => patron.test(ruta))
  return { seccion: null, titulo: extra ? extra[1] : "" }
}

const fechaDeHoy = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" })

const DashboardNavbar = () => {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const { hasPermission } = usePermissions()
  const { shouldShowSidebar } = useLayoutType()
  const { isCollapsed } = useSidebar()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef(null)

  const userName = user?.nombre || user?.name || localStorage.getItem("userName") || "Usuario"
  const userRole = user?.role || ""
  const avatarGuardado = localStorage.getItem(`userAvatar_${localStorage.getItem("userId")}`)
  const avatarUrl = avatarOptions[avatarGuardado] || avatarOptions.avatar1

  // Cierra el menú de usuario al hacer clic fuera o con Escape
  useEffect(() => {
    if (!showUserMenu) return
    const alHacerClic = (e) => menuRef.current && !menuRef.current.contains(e.target) && setShowUserMenu(false)
    const alPulsarTecla = (e) => e.key === "Escape" && setShowUserMenu(false)
    document.addEventListener("mousedown", alHacerClic)
    document.addEventListener("keydown", alPulsarTecla)
    return () => {
      document.removeEventListener("mousedown", alHacerClic)
      document.removeEventListener("keydown", alPulsarTecla)
    }
  }, [showUserMenu])

  if (!shouldShowSidebar) return null

  const { seccion, titulo } = tituloDe(pathname)
  const ir = (ruta) => {
    navigate(ruta)
    setShowUserMenu(false)
  }

  return (
    <header className={`dashboard-navbar ${isCollapsed ? "sidebar-collapsed" : "sidebar-expanded"}`}>
      <div className="navbar-ubicacion">
        {seccion && <span className="navbar-seccion">{seccion}</span>}
        {titulo && <h1 className="navbar-titulo">{titulo}</h1>}
      </div>

      <div className="navbar-acciones">
        <span className="navbar-fecha">{fechaDeHoy.format(new Date())}</span>
        <ThemeToggle />

        <div className="navbar-usuario" ref={menuRef}>
          <button
            className="navbar-usuario-boton"
            onClick={() => setShowUserMenu((abierto) => !abierto)}
            aria-expanded={showUserMenu}
            aria-haspopup="menu"
          >
            <img src={avatarUrl} alt="" className="navbar-avatar" />
            <span className="navbar-usuario-nombre">{userName}</span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>

          {showUserMenu && (
            <div className="navbar-menu" role="menu">
              <div className="navbar-menu-cabecera">
                <span className="navbar-menu-nombre">{userName}</span>
                {userRole && <span className="navbar-menu-rol">{userRole}</span>}
              </div>
              <button role="menuitem" onClick={() => ir("/profile")}>
                <User size={16} aria-hidden="true" /> Mi perfil
              </button>
              {hasPermission("verUsuariosMenu") && (
                <button role="menuitem" onClick={() => ir("/usuarios")}>
                  <Settings size={16} aria-hidden="true" /> Usuarios y permisos
                </button>
              )}
              <hr />
              <button
                role="menuitem"
                className="navbar-menu-salir"
                onClick={() => {
                  logout()
                  navigate("/login")
                }}
              >
                <LogOut size={16} aria-hidden="true" /> Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default DashboardNavbar
