"use client"
import { Link } from "react-router-dom"

// Opción del menú lateral (el permiso ya lo filtra SidebarMenu)
const MenuItem = ({ icon: Icon, children, to, isActive, onClick, collapsed }) => (
  <Link
    to={to}
    className={`menu-item ${isActive ? "active" : ""}`}
    onClick={onClick}
    title={collapsed ? children : undefined}
    aria-current={isActive ? "page" : undefined}
  >
    <Icon className="menu-icon" size={18} strokeWidth={1.75} aria-hidden="true" />
    {!collapsed && <span className="menu-text">{children}</span>}
  </Link>
)

export default MenuItem
