# API de NailSoft

> Archivo generado con `npm run docs:api` a partir de las rutas reales. No lo edites a mano.

## Convenciones

- **Autenticación:** encabezado `Authorization: Bearer <token>`. El token se obtiene en `POST /api/auth/login` y dura 24 horas. Cambiar la contraseña invalida los tokens anteriores.
- **Permisos:** cada ruta indica los permisos que acepta; basta con tener uno. Los terminados en `Propias` limitan la acción a los registros del propio cliente o empleado (por ejemplo, con `verCitasPropias` un cliente solo recibe sus citas).
- **Errores:** siempre JSON con `msg` y `message` (el mismo texto). Las validaciones pueden incluir `errores` con el detalle.

| Código | Significado                                                                                                            |
| ------ | ---------------------------------------------------------------------------------------------------------------------- |
| 400    | Datos no válidos (incluye ids mal formados)                                                                            |
| 401    | Sin sesión, token inválido o expirado, o cuenta desactivada (`cuentaInactiva: true`)                                   |
| 403    | Falta el permiso (`permisoNoAsignado` o `permisoDesactivado: true`) o el rol está desactivado (`rolDesactivado: true`) |
| 404    | No existe o no está en el alcance del usuario                                                                          |
| 409    | Conflicto: choque de horario, registro duplicado o eliminar algo con historial                                         |
| 413    | Petición demasiado grande (JSON de más de 1 MB)                                                                        |
| 429    | Demasiadas peticiones: 10 cada 15 minutos en login, registro y recuperación de contraseña                              |

- **Imágenes:** JPG, PNG, WEBP o GIF de hasta 5 MB. Se sirven en `/uploads/<archivo>`.
- **Horarios:** la agenda usa la hora local del spa (`TZ`, por defecto America/Bogota). Los clientes agendan entre 9:00 y 18:00.

## Rutas

### usuarios

| Método | Ruta                              | Acceso               | Descripción                                                                                                |
| ------ | --------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------- |
| GET    | `/api/usuarios`                   | `verUsuarios`        | Obtener todos los usuarios (sin mostrar contraseñas)                                                       |
| GET    | `/api/usuarios/buscar/prom`       | `verUsuarios`        | Buscar usuarios por texto (q en nombre, apellido o correo; nombre) con paginación (page, limit)            |
| GET    | `/api/usuarios/:id`               | Sesión iniciada      | Obtener un usuario específico por ID                                                                       |
| POST   | `/api/usuarios`                   | `crearUsuarios`      | Crear un usuario con su rol; los roles Cliente y Empleado crean o enlazan su ficha                         |
| PUT    | `/api/usuarios/:id`               | Sesión iniciada      | Actualizar un usuario: cada uno edita sus datos; rol, estado y otros usuarios requieren actualizarUsuarios |
| PUT    | `/api/usuarios/:id/update-rol`    | `actualizarUsuarios` | Actualizar solo el rol de un usuario                                                                       |
| PATCH  | `/api/usuarios/:id/toggle-estado` | `actualizarUsuarios` | Añadir esta nueva función al final del archivo, antes del module.exports Activar/Desactivar un usuario     |
| DELETE | `/api/usuarios/:id`               | `eliminarUsuarios`   | Eliminar un usuario                                                                                        |

### roles

| Método | Ruta                           | Acceso          | Descripción                                                  |
| ------ | ------------------------------ | --------------- | ------------------------------------------------------------ |
| GET    | `/api/roles`                   | `verRoles`      | Método GET para obtener los roles                            |
| POST   | `/api/roles`                   | `crearRol`      | Método POST para crear un nuevo rol                          |
| PUT    | `/api/roles/:id`               | `actualizarRol` | Método PUT para actualizar un rol por su id                  |
| PATCH  | `/api/roles/:id/toggle-estado` | `actualizarRol` | Método para cambiar el estado de un rol (activar/desactivar) |
| DELETE | `/api/roles/:id`               | `eliminarRol`   | Método DELETE para eliminar un rol por su id                 |
| GET    | `/api/roles/export-excel`      | `verRoles`      | Método para exportar roles a Excel                           |

### permisos

| Método | Ruta                         | Acceso               | Descripción                |
| ------ | ---------------------------- | -------------------- | -------------------------- |
| GET    | `/api/permisos`              | `verPermisos`        | Obtener todos los permisos |
| POST   | `/api/permisos`              | `crearPermisos`      | Crear un nuevo permiso     |
| PUT    | `/api/permisos/:id`          | `actualizarPermisos` | Actualizar un permiso      |
| DELETE | `/api/permisos/:id`          | `eliminarPermisos`   | Eliminar un permiso        |
| GET    | `/api/permisos/export-excel` | `verPermisos`        | Exportar permisos a Excel  |

### tiposervicios

| Método | Ruta                                   | Acceso                    | Descripción                                                   |
| ------ | -------------------------------------- | ------------------------- | ------------------------------------------------------------- |
| GET    | `/api/tiposervicios`                   | Sesión iniciada           | Obtener todos los descuentos                                  |
| POST   | `/api/tiposervicios`                   | `crearTipoDescuento`      | Crear un nuevo descuento                                      |
| PUT    | `/api/tiposervicios/:id`               | `actualizarTipoDescuento` | Actualizar un tipo de servicio                                |
| DELETE | `/api/tiposervicios/:id`               | `eliminarTipoDescuento`   | Eliminar un tipo de servicio                                  |
| PATCH  | `/api/tiposervicios/:id/toggle-estado` | `actualizarTipoDescuento` | Cambiar el estado de un tipo de servicio (activar/desactivar) |

### tiposervicioss

| Método | Ruta                                    | Acceso                    | Descripción                           |
| ------ | --------------------------------------- | ------------------------- | ------------------------------------- |
| GET    | `/api/tiposervicioss`                   | Sesión iniciada           | Obtener todos los tipos de servicios  |
| POST   | `/api/tiposervicioss`                   | `crearTipoServicios`      | Crear una categoría de servicio       |
| PUT    | `/api/tiposervicioss/:id`               | `actualizarTipoServicios` | Actualizar un tipo de servicio        |
| DELETE | `/api/tiposervicioss/:id`               | `eliminarTipoServicios`   | Eliminar un tipo de servicio          |
| PATCH  | `/api/tiposervicioss/:id/toggle-estado` | `actualizarTipoServicios` | cambiar el etado del tipod e servicio |

### servicios

| Método | Ruta                               | Acceso                | Descripción                                                               |
| ------ | ---------------------------------- | --------------------- | ------------------------------------------------------------------------- |
| GET    | `/api/servicios`                   | `verServicios`        | Obtener todos los servicios                                               |
| GET    | `/api/servicios/validar-nombre`    | `verServicios`        | Validar que el nombre del servicio no esté duplicado                      |
| GET    | `/api/servicios/export-excel`      | `verServicios`        | Exportar servicios a Excel                                                |
| POST   | `/api/servicios`                   | `crearServicios`      | Crear un nuevo servicio (imagen opcional en el campo `imagen`, multipart) |
| PUT    | `/api/servicios/:id`               | `actualizarServicios` | Actualizar un servicio (imagen opcional en el campo `imagen`, multipart)  |
| DELETE | `/api/servicios/:id`               | `eliminarServicios`   | Eliminar un servicio                                                      |
| PATCH  | `/api/servicios/:id/toggle-estado` | `actualizarServicios` | Cambiar el estado de un servicio (activar/desactivar)                     |

### catalogo

| Método | Ruta            | Acceso  | Descripción                                                                                        |
| ------ | --------------- | ------- | -------------------------------------------------------------------------------------------------- |
| GET    | `/api/catalogo` | Público | Carta pública de servicios: solo los activos, con su categoría y la promoción vigente (sin sesión) |

### insumos

| Método | Ruta                                 | Acceso                               | Descripción                                       |
| ------ | ------------------------------------ | ------------------------------------ | ------------------------------------------------- |
| GET    | `/api/insumos`                       | `verInsumos`                         | Obtener todos los insumos                         |
| GET    | `/api/insumos/verificar/:nombre`     | `verInsumos`                         | Verificar si existe un insumo con el mismo nombre |
| POST   | `/api/insumos`                       | `crearInsumos`                       | Crear un nuevo insumo                             |
| POST   | `/api/insumos/dar-de-baja`           | `crearBajaProducto`                  | Dar de baja un insumo y descontar del stock       |
| PUT    | `/api/insumos/incrementar-stock/:id` | `actualizarInsumos` o `crearCompras` | Incrementar el stock de un insumo existente       |
| PUT    | `/api/insumos/:id`                   | `actualizarInsumos`                  | Actualizar un insumo por ID                       |
| PATCH  | `/api/insumos/:id/estado`            | `actualizarInsumos`                  | Cambiar el estado de un insumo por ID             |
| DELETE | `/api/insumos/:id`                   | `eliminarInsumos`                    | Eliminar un insumo por ID                         |

### empleados

| Método | Ruta                               | Acceso                | Descripción                   |
| ------ | ---------------------------------- | --------------------- | ----------------------------- |
| GET    | `/api/empleados`                   | Sesión iniciada       | Obtener todos los empleados   |
| GET    | `/api/empleados/:id`               | Sesión iniciada       | Obtener un empleado por ID    |
| POST   | `/api/empleados`                   | `crearEmpleados`      | Crear un nuevo empleado       |
| PUT    | `/api/empleados/:id`               | `actualizarEmpleados` | Actualizar un empleado        |
| DELETE | `/api/empleados/:id`               | `eliminarEmpleados`   | Eliminar un empleado          |
| PATCH  | `/api/empleados/:id/toggle-estado` | `actualizarEmpleados` | Cambiar estado de un empleado |

### clientes

| Método | Ruta                              | Acceso              | Descripción                                                      |
| ------ | --------------------------------- | ------------------- | ---------------------------------------------------------------- |
| GET    | `/api/clientes/perfil`            | Sesión iniciada     | Perfil de cliente del usuario autenticado                        |
| GET    | `/api/clientes`                   | Sesión iniciada     | Obtener los clientes: todos con verCliente, si no solo el propio |
| GET    | `/api/clientes/:id`               | Sesión iniciada     | Obtener un cliente por ID                                        |
| POST   | `/api/clientes`                   | `crearCliente`      | Crear un nuevo cliente                                           |
| PUT    | `/api/clientes/:id`               | Sesión iniciada     | Actualizar un cliente                                            |
| DELETE | `/api/clientes/:id`               | `eliminarCliente`   | Eliminar un cliente                                              |
| PATCH  | `/api/clientes/:id/toggle-estado` | `actualizarCliente` | Cambiar estado de un cliente                                     |

### citas

| Método | Ruta                                  | Acceso                                                                            | Descripción                                                                                                                                                                                                                       |
| ------ | ------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/citas`                          | `crearCitas` o `crearCitasPropias`                                                | Crear una cita: valida choques de horario y calcula precio y duración con los servicios                                                                                                                                           |
| GET    | `/api/citas`                          | `verCitas` o `verCitasPropias`                                                    | Obtener las citas: todas con verCitas, si no solo las propias                                                                                                                                                                     |
| GET    | `/api/citas/cliente`                  | `verCitas` o `verCitasPropias`                                                    | Citas de un cliente: las propias, o las de clienteId (query) con verCitas                                                                                                                                                         |
| POST   | `/api/citas/verificar-disponibilidad` | `crearCitas` o `crearCitasPropias` o `actualizarCitas` o `actualizarCitasPropias` | Verificar disponibilidad del empleado                                                                                                                                                                                             |
| GET    | `/api/citas/ocupados`                 | `crearCitas` o `crearCitasPropias` o `actualizarCitas` o `actualizarCitasPropias` | Horarios ocupados desde una fecha (por defecto hoy), sin datos de los clientes, para que cualquier usuario que agenda vea qué franjas están tomadas. Query: desde (YYYY-MM-DD), hasta (YYYY-MM-DD, opcional), empleado (opcional) |
| GET    | `/api/citas/:id`                      | `verCitas` o `verCitasPropias`                                                    | Obtener una cita por ID                                                                                                                                                                                                           |
| PUT    | `/api/citas/:id`                      | `actualizarCitas` o `actualizarCitasPropias`                                      | Actualizar una cita por ID                                                                                                                                                                                                        |
| DELETE | `/api/citas/:id`                      | `eliminarCitas`                                                                   | Eliminar una cita por ID                                                                                                                                                                                                          |
| PUT    | `/api/citas/:id/iniciar`              | `actualizarCitas` o `actualizarCitasPropias`                                      | Iniciar una cita confirmada (pasa a "En Progreso")                                                                                                                                                                                |
| PUT    | `/api/citas/:id/cancelar`             | `actualizarCitas` o `actualizarCitasPropias` o `cancelarCitasPropias`             | Cancelar una cita (requiere motivo); no aplica a citas completadas o canceladas                                                                                                                                                   |

### proveedores

| Método | Ruta                          | Acceso                | Descripción                              |
| ------ | ----------------------------- | --------------------- | ---------------------------------------- |
| GET    | `/api/proveedores`            | `verProveedor`        | Obtener todos los proveedores            |
| POST   | `/api/proveedores`            | `crearProveedor`      | Crear un nuevo proveedor                 |
| PUT    | `/api/proveedores/:id`        | `actualizarProveedor` | Actualizar un proveedor por ID           |
| DELETE | `/api/proveedores/:id`        | `eliminarProveedor`   | Eliminar un proveedor por ID             |
| PATCH  | `/api/proveedores/:id/estado` | `actualizarProveedor` | Cambiar el estado de un proveedor por ID |

### categoriaproductos

| Método | Ruta                          | Acceso                        | Descripción                  |
| ------ | ----------------------------- | ----------------------------- | ---------------------------- |
| GET    | `/api/categoriaproductos`     | `verCategoriaProducto`        | Obtener todas las categorías |
| GET    | `/api/categoriaproductos/:id` | `verCategoriaProducto`        | Obtener una categoría por ID |
| POST   | `/api/categoriaproductos`     | `crearCategoriaProducto`      | Crear una nueva categoría    |
| PUT    | `/api/categoriaproductos/:id` | `actualizarCategoriaProducto` | Actualizar una categoría     |
| DELETE | `/api/categoriaproductos/:id` | `eliminarCategoriaProducto`   | Eliminar una categoría       |

### productos

| Método | Ruta                 | Acceso               | Descripción                                                               |
| ------ | -------------------- | -------------------- | ------------------------------------------------------------------------- |
| GET    | `/api/productos`     | `verProducto`        | Obtener todos los productos                                               |
| POST   | `/api/productos`     | `crearProducto`      | Crear un nuevo producto (imagen opcional en el campo `imagen`, multipart) |
| PUT    | `/api/productos/:id` | `actualizarProducto` | Actualizar un producto (imagen opcional en el campo `imagen`, multipart)  |
| DELETE | `/api/productos/:id` | `eliminarProducto`   | Eliminar un producto                                                      |

### compras

| Método | Ruta               | Acceso              | Descripción |
| ------ | ------------------ | ------------------- | ----------- |
| POST   | `/api/compras`     | `crearCompras`      |             |
| GET    | `/api/compras`     | `verCompras`        |             |
| GET    | `/api/compras/:id` | `verCompras`        |             |
| PUT    | `/api/compras/:id` | `actualizarCompras` |             |
| DELETE | `/api/compras/:id` | `eliminarCompras`   |             |

### auth

| Método | Ruta                               | Acceso          | Descripción                                                                                       |
| ------ | ---------------------------------- | --------------- | ------------------------------------------------------------------------------------------------- |
| POST   | `/api/auth/login`                  | Público         | Iniciar sesión: devuelve token, rol y permisos activos                                            |
| POST   | `/api/auth/register`               | Público         | Registro público: siempre crea un usuario con rol Cliente                                         |
| POST   | `/api/auth/request-password-reset` | Público         | Enviar por correo un código de 6 dígitos para restablecer la contraseña (válido 15 minutos)       |
| POST   | `/api/auth/verify-reset-token`     | Público         | Verificar el código de recuperación (máximo 5 intentos); devuelve una autorización de un solo uso |
| POST   | `/api/auth/reset-password`         | Público         | Cambiar la contraseña con la autorización de verify-reset-token                                   |
| GET    | `/api/auth/user`                   | Sesión iniciada | Obtener datos del usuario autenticado - Compatible con tu middleware                              |

### baja-productos

| Método | Ruta                      | Acceso                 | Descripción                                                   |
| ------ | ------------------------- | ---------------------- | ------------------------------------------------------------- |
| GET    | `/api/baja-productos`     | `verBajaProductos`     | Obtener las bajas de productos                                |
| POST   | `/api/baja-productos`     | `crearBajaProducto`    | Crear una nueva baja de producto y descontar del stock        |
| DELETE | `/api/baja-productos/:id` | `eliminarBajaProducto` | Eliminar una baja de producto y restaurar el stock del insumo |

### ventas

| Método | Ruta                                | Acceso                                         | Descripción                                                                                                                                        |
| ------ | ----------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/ventas`                       | `verVentas` o `verVentasPropias`               | Obtener las ventas: todas con verVentas, si no solo las propias                                                                                    |
| GET    | `/api/ventas/cliente`               | `verVentas` o `verVentasPropias`               | Obtener ventas por cliente                                                                                                                         |
| GET    | `/api/ventas/cita/:citaId`          | `verVentas` o `verVentasPropias`               | En venta.js (controlador)                                                                                                                          |
| GET    | `/api/ventas/:id`                   | `verVentas` o `verVentasPropias`               | Obtener una venta por ID                                                                                                                           |
| POST   | `/api/ventas`                       | `crearVentas`                                  | Crear una nueva venta. Precios desde la base de datos; el stock se reserva al final.                                                               |
| PUT    | `/api/ventas/:id`                   | `actualizarVentas` o `actualizarVentasPropias` | Actualizar una venta pendiente: recalcula todo y ajusta el stock                                                                                   |
| DELETE | `/api/ventas/:id`                   | `eliminarVentas`                               | Eliminar una venta y devolver el stock de sus productos                                                                                            |
| PUT    | `/api/ventas/:id/finalizar`         | `actualizarVentas` o `actualizarVentasPropias` | Finalizar una venta, opcionalmente con nuevos descuentos manuales. Si ya estaba finalizada y no llegan descuentos, solo la devuelve (idempotente). |
| PUT    | `/api/ventas/:id/agregar-productos` | `actualizarVentas` o `actualizarVentasPropias` | Agregar productos a una venta pendiente                                                                                                            |
| PUT    | `/api/ventas/:id/agregar-servicios` | `actualizarVentas` o `actualizarVentasPropias` | Agregar servicios a una venta pendiente                                                                                                            |
