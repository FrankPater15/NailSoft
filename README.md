# NailSoft — Sistema de gestión para el Spa "S&B"

[![Ver en Firebase](https://img.shields.io/badge/Ver%20App%20en-Firebase-orange?style=for-the-badge&logo=firebase)](https://nailsoft-7d03c.web.app/login)

NailSoft es un sistema web y móvil para gestionar un spa de diseño de uñas: agendamiento de citas con varios servicios, registro de ventas, compras de insumos y reportes, con permisos dinámicos por rol.

Proyecto formativo del **SENA** (Tecnólogo en Análisis y Desarrollo de Software), desarrollado entre febrero y junio de 2025.

![Logo NailSoft](https://gitbf.onrender.com/uploads/SPA%20Y%20BELLEZA%20MARCA%20DE%20AGUA%20DISTINTA.png)

## Probar la aplicación

Entra a la [aplicación web](https://nailsoft-7d03c.web.app/login) con la cuenta de prueba de administrador:

| Usuario | Contraseña |
|---------|------------|
| test@gmail.com | Test123! |

> El backend está en el plan gratuito de Render, que se suspende cuando nadie lo usa. La primera carga puede tardar unos 30 segundos; después responde normal.

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
- Una base de datos MongoDB (local o Atlas)

### 1. Clonar el repositorio

```bash
git clone https://github.com/IHomoSapienI/ProyectoNailSoft.git
cd ProyectoNailSoft
```

### 2. Backend

```bash
cd Backend
npm install
cp .env.example .env   # luego llena los valores del .env
node index.js          # la API queda en http://localhost:3000
```

### 3. Frontend

```bash
cd Frontend
npm install
npm run dev
```

### 4. Pruebas del backend

```bash
cd Backend
npm test
```

## Estado del proyecto

Versión 1.0.0 — proyecto finalizado (SENA, 2025).

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
