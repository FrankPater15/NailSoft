"use client"

import { useLocation } from "react-router-dom"
import { menuConfig } from "../../config/menuConfig"
import MenuGroup from "../../config/MenuGroup"
import MenuItem from "../../config/MenuItem"
import { usePermissions } from "../../hooks/usePermissions"
import { useSidebar } from "./Sidebar"

const SidebarMenu = ({ collapsed }) => {
  const location = useLocation()
  const { closeMobileSidebar } = useSidebar()
  const { hasPermission } = usePermissions()

  // Solo las opciones permitidas, agrupadas en el orden de menuConfig
  const grupos = []
  for (const item of menuConfig) {
    if (item.permission && !hasPermission(item.permission)) continue
    const nombre = item.group || ""
    let grupo = grupos.find((g) => g.nombre === nombre)
    if (!grupo) grupos.push((grupo = { nombre, items: [] }))
    grupo.items.push(item)
  }

  const renderItem = (item) => (
    <MenuItem
      key={item.path}
      to={item.path}
      icon={item.icon}
      collapsed={collapsed}
      isActive={location.pathname === item.path}
      onClick={closeMobileSidebar}
    >
      {item.label}
    </MenuItem>
  )

  return (
    <nav aria-label="Menú principal">
      {grupos.map((grupo) =>
        grupo.nombre ? (
          <MenuGroup key={grupo.nombre} title={grupo.nombre} collapsed={collapsed}>
            {grupo.items.map(renderItem)}
          </MenuGroup>
        ) : (
          <div key="sin-grupo" className="menu-group">
            {grupo.items.map(renderItem)}
          </div>
        ),
      )}
    </nav>
  )
}

export default SidebarMenu
