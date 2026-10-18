# NailSoft — Sistema de gestión para el Spa "S&B"

NailSoft es un sistema web y móvil para gestionar un spa de diseño de uñas: agendamiento de citas con varios servicios, registro de ventas, compras de insumos y reportes, con permisos dinámicos por rol.

Nació como proyecto formativo del **SENA** (Tecnólogo en Análisis y Desarrollo de Software), desarrollado en equipo entre febrero y junio de 2025. Desde 2026 lo continúo como proyecto personal.

![Logo NailSoft](Backend/uploads/SPA%20Y%20BELLEZA%20MARCA%20DE%20AGUA%20DISTINTA.png)

## Equipo

- Sebastián Álvarez Restrepo
- Cristian Camilo Torres Arboleda
- Luis Mario Correa Gil
- Frank Javier Oronó Paternina

## Tecnologías

| Parte | Tecnologías |
|-------|-------------|
| Frontend web | React + Vite, Tailwind CSS, Material UI |
| Backend | Node.js, Express, JWT, Joi, Nodemailer |
| Base de datos | MongoDB Atlas (Mongoose) |
| App móvil | Flutter (Dart) |
| Pruebas | Jest, Supertest |
| Despliegue | Firebase Hosting (web), Render (API) |

## Funcionalidades

- **Roles y permisos dinámicos:** los permisos se asignan a cada rol desde la aplicación, sin depender de roles fijos en el código.
  - **Administrador:** gestión completa (usuarios, servicios, ventas, compras, reportes).
  - **Empleado:** agenda, citas y servicios prestados.
  - **Cliente:** reserva de citas y galería de servicios.
- **Citas** con selección de varios servicios y agenda por empleado.
- **Ventas** con descuentos, y **compras y bajas** de insumos.
- **Reportes** estadísticos visuales.
- **Recuperación de contraseña** por correo.
- **Modo claro y oscuro**, diseño 100 % responsive.
- **App móvil** para que el administrador consulte citas, ventas y empleados.
- Más de 90 en todas las métricas de Google Lighthouse.

## Instalación local

### Requisitos

- Node.js 18 o superior
- MongoDB local (en Windows: `winget install MongoDB.Server`) o un clúster de Atlas

### 1. Clonar el repositorio

```bash
git clone https://github.com/FrankPater15/NailSoft.git
cd NailSoft
```

### 2. Backend

```bash
cd Backend
npm install
cp .env.example .env   # llena JWT_SECRET y, si quieres recuperar contraseñas, los datos del correo
npm run seed           # crea permisos, roles y el usuario administrador
npm run dev            # la API queda en http://localhost:3000 y se recarga al guardar
```

El seed crea el administrador `admin@nailsoft.local` con contraseña `Admin123!`. Puedes cambiarlos con las variables `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` antes de correrlo.

Para tener datos con los que probar, `npm run seed:demo` agrega servicios, productos, citas, ventas y un usuario por rol (contraseña `Prueba123!`):

| Rol | Usuario | Qué puede hacer |
|-----|---------|-----------------|
| Empleado | `empleado1@nailsoft.local`, `empleado2@nailsoft.local` | Su agenda, sus citas y sus ventas |
| Cliente | `cliente1@nailsoft.local`, `cliente2@nailsoft.local` | Catálogo, agendar y cancelar sus citas |
| Recepcionista | `recepcion@nailsoft.local` | Todas las citas, clientes y ventas |
| Inventario | `inventario@nailsoft.local` | Productos, insumos, proveedores y compras |

> `npm run seed` vuelve a asignar a cada rol sus permisos iniciales: los cambios de permisos hechos desde la aplicación se pierden.

Si ya tenías una base de datos de una versión anterior, actualiza sus datos al modelo actual (stock numérico, fichas enlazadas a su usuario, fechas de citas e índices). Se puede correr varias veces:

```bash
npm run migrar
```

### Permisos

Cada ruta de la API exige un permiso. Los permisos terminados en `Propias` (por ejemplo `verCitasPropias`) limitan la acción a los registros del propio usuario: un cliente solo ve sus citas y un empleado solo las que tiene asignadas. Los roles se configuran desde la aplicación, sin depender de nombres fijos en el código.

### 3. Frontend

```bash
cd Frontend
npm install
cp .env.example .env   # VITE_BACKEND_URL apunta al backend (http://localhost:3000)
npm run dev            # http://localhost:5173
```

### 4. App móvil (opcional)

Requiere [Flutter](https://docs.flutter.dev/get-started/install). La URL del backend se pasa al compilar:

```bash
cd mobile
flutter pub get
flutter run -d chrome --dart-define=API_URL=http://localhost:3000
# En el emulador de Android, el PC se ve como 10.0.2.2:
# flutter run --dart-define=API_URL=http://10.0.2.2:3000
```

### 5. Pruebas del backend

Las pruebas de seguridad usan MongoDB local, en una base aparte (`NailsSoft_test`) que se crea y se borra en cada ejecución. Para usar otra, define `MONGODB_CNN_TEST`.

```bash
cd Backend
npm test
```

## Estado del proyecto

Versión 1.0.0 entregada al SENA en 2025; en desarrollo como proyecto personal.

## Galería

### Métricas de Lighthouse
![Métricas de Lighthouse](image.png)

### Panel de administrador, modo claro
![Panel de administrador en modo claro](image-1.png)

### Panel de administrador, modo oscuro
![Panel de administrador en modo oscuro](image-2.png)

### Landing para clientes
![Landing para clientes](image-3.png)

### Reportes
![Panel de reportes](image-4.png)

### Galería de servicios
![Galería de servicios](image-5.png)

### Agendamiento de citas
![Agendamiento de citas](image-6.png)

## Licencia

[Creative Commons Atribución-NoComercial 4.0 Internacional (CC BY-NC 4.0)](LICENSE).
