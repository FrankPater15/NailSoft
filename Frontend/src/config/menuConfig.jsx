import {
  LayoutGrid,
  CalendarDays,
  CalendarRange,
  Timer,
  Receipt,
  Sparkles,
  Shapes,
  BadgePercent,
  Store,
  Users,
  UserRound,
  Package,
  Tags,
  Boxes,
  PackageMinus,
  ShoppingBag,
  Truck,
  UserCog,
  ShieldCheck,
  KeyRound,
} from "lucide-react"

// Menú lateral agrupado según el trabajo diario del spa.
// Cada opción solo se muestra si el usuario tiene su permiso; un grupo sin opciones visibles no se muestra.
export const menuConfig = [
  { label: "Inicio", path: "/dashboard", icon: LayoutGrid, permission: "visualizarDashboardMenu" },

  { label: "Citas", path: "/citas", icon: CalendarDays, group: "Agenda", permission: "verCitasMenu" },
  {
    label: "Agenda por empleado",
    path: "/agenda-empleado",
    icon: CalendarRange,
    group: "Agenda",
    permission: "verAgendaEmpleadosMenu",
  },
  {
    label: "En atención",
    path: "/citas-en-progreso",
    icon: Timer,
    group: "Agenda",
    permission: "visualizarCitaEnProgresoMenu",
  },

  { label: "Ventas", path: "/ventas-unificadas", icon: Receipt, group: "Ventas", permission: "verVentasUnificadasMenu" },

  { label: "Servicios", path: "/servicios", icon: Sparkles, group: "Catálogo", permission: "verServiciosMenu" },
  { label: "Categorías", path: "/tiposervicioss", icon: Shapes, group: "Catálogo", permission: "verTipoServiciosMenu" },
  { label: "Descuentos", path: "/tiposervicios", icon: BadgePercent, group: "Catálogo", permission: "verTipoDescuentoMenu" },
  { label: "Vista de clientes", path: "/articles", icon: Store, group: "Catálogo", permission: "verCatalogoMenu" },

  { label: "Clientes", path: "/clientes", icon: Users, group: "Personas", permission: "verClientesMenu" },
  { label: "Empleados", path: "/empleados", icon: UserRound, group: "Personas", permission: "verEmpleadosMenu" },

  { label: "Productos", path: "/productos", icon: Package, group: "Inventario", permission: "verProductosMenu" },
  {
    label: "Categorías de productos",
    path: "/categoriaProductos",
    icon: Tags,
    group: "Inventario",
    permission: "verCategoriaProductosMenu",
  },
  { label: "Insumos", path: "/insumos", icon: Boxes, group: "Inventario", permission: "verInsumosMenu" },
  { label: "Bajas", path: "/baja-producto", icon: PackageMinus, group: "Inventario", permission: "verBajaProductoMenu" },
  { label: "Compras", path: "/compras", icon: ShoppingBag, group: "Inventario", permission: "verComprasMenu" },
  { label: "Proveedores", path: "/proveedores", icon: Truck, group: "Inventario", permission: "verProveedoresMenu" },

  { label: "Usuarios", path: "/usuarios", icon: UserCog, group: "Configuración", permission: "verUsuariosMenu" },
  { label: "Roles", path: "/roles", icon: ShieldCheck, group: "Configuración", permission: "visualizarRolesMenu" },
  { label: "Permisos", path: "/permisos", icon: KeyRound, group: "Configuración", permission: "verPermisosMenu" },
]
