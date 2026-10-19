"use client"

import { useState, useEffect } from "react"
import { useSidebar } from "../Sidebar/Sidebar"
import { useLayoutType } from "../../hooks/useLayoutType"
import DashboardNavbar from "../NavBars/DashboardNavbar"
import Footer from "../Footer/Footer"
import "./mainLayout.css"

const MainLayout = ({ children }) => {
  const { isCollapsed } = useSidebar()
  const { shouldShowSidebar } = useLayoutType()
  const [sidebarState, setSidebarState] = useState(isCollapsed)
  const [isMobile, setIsMobile] = useState(false)

  // Detectar si es móvil
  useEffect(() => {
    const checkIsMobile = () => window.innerWidth < 768
    setIsMobile(checkIsMobile())

    const handleResize = () => {
      setIsMobile(checkIsMobile())
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Escuchar cambios en el estado del sidebar
  useEffect(() => {
    setSidebarState(isCollapsed)
  }, [isCollapsed])

  // Escuchar eventos del sidebar (importante para sincronización)
  useEffect(() => {
    const handleSidebarStateChanged = (event) => {
      if (event.detail && event.detail.isCollapsed !== undefined) {
        setSidebarState(event.detail.isCollapsed)
      }
    }

    window.addEventListener("sidebarStateChanged", handleSidebarStateChanged)
    return () => window.removeEventListener("sidebarStateChanged", handleSidebarStateChanged)
  }, [])

  // Solo mostrar este layout si debe mostrar sidebar
  if (!shouldShowSidebar) {
    return null
  }

  const mainContentClass = sidebarState ? "sidebar-collapsed" : "sidebar-expanded"

  return (
    <div className="main-layout">
      {/* Navbar administrativo */}
      <DashboardNavbar />

      {/* Contenido principal */}
      <div
        className={`main-content ${mainContentClass}`}
        style={{
          // Aplicar estilos inline para asegurar que se apliquen correctamente
          marginLeft: isMobile ? "0" : sidebarState ? "var(--sidebar-width-collapsed)" : "var(--sidebar-width-expanded)",
          width: isMobile ? "100%" : sidebarState ? "calc(100% - var(--sidebar-width-collapsed))" : "calc(100% - var(--sidebar-width-expanded))",
          paddingTop: "var(--navbar-height)", // Espacio para la barra superior fija
        }}
      >
        {/* Contenido de la página */}
        <div className="content-wrapper">{children}</div>

        {/* Footer administrativo */}
        <Footer />
      </div>
    </div>
  )
}

export default MainLayout
