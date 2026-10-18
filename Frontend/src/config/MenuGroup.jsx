"use client"

// Sección del menú lateral. Con el menú colapsado el título se oculta y queda un separador.
const MenuGroup = ({ title, children, collapsed }) => (
  <div className={`menu-group ${collapsed ? "collapsed" : ""}`}>
    {collapsed ? <hr className="menu-group-divider" /> : <p className="menu-group-title">{title}</p>}
    {children}
  </div>
)

export default MenuGroup
