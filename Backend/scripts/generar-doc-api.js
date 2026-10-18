// Genera docs/API.md a partir de los routers reales de Express: rutas, métodos, si piden
// sesión, permisos requeridos y la descripción del controlador (su comentario "//" previo).
// Uso: npm run docs:api
process.env.NODE_ENV = process.env.NODE_ENV || "test"; // sin avisos de correo al cargar
const fs = require("fs");
const path = require("path");
const { RUTAS } = require("../modules/server");

const raiz = path.join(__dirname, "..");
const fuentesControladores = fs
  .readdirSync(path.join(raiz, "controllers"))
  .map((archivo) => fs.readFileSync(path.join(raiz, "controllers", archivo), "utf8"));

// Comentario de una o más líneas justo encima de "const nombre = "
const descripcionDe = (nombre) => {
  for (const fuente of fuentesControladores) {
    const lineas = fuente.split(/\r?\n/);
    const i = lineas.findIndex((l) => l.startsWith(`const ${nombre} = `));
    if (i < 0) continue;
    const comentario = [];
    for (let j = i - 1; j >= 0 && /^\s*\/\//.test(lineas[j]); j--) {
      comentario.unshift(lineas[j].replace(/^\s*\/\/\s?/, ""));
    }
    return comentario.join(" ").replace(/^NUEVO:\s*/, "") || nombre;
  }
  return nombre;
};

const titulo = (prefijo) => prefijo.replace("/api/", "");

const secciones = RUTAS.map(([prefijo, router]) => {
  let pideSesion = false;
  const filas = [];
  for (const capa of router.stack) {
    if (!capa.route) {
      if (capa.handle.name === "validarJWT") pideSesion = true;
      continue;
    }
    const manejadores = capa.route.stack.map((s) => s.handle);
    const permisos = manejadores.filter((m) => m.permisos).map((m) => m.permisos.map((p) => `\`${p}\``).join(" o "));
    const imagen = manejadores.find((m) => m.campoImagen);
    const controlador = manejadores[manejadores.length - 1].name;
    const metodos = Object.keys(capa.route.methods).map((m) => m.toUpperCase());
    const sesion = pideSesion || manejadores.some((m) => m.name === "validarJWT");
    const acceso = permisos.length ? permisos.join(", ") : sesion ? "Sesión iniciada" : "Público";
    let descripcion = descripcionDe(controlador);
    if (imagen) descripcion += ` (imagen opcional en el campo \`${imagen.campoImagen}\`, multipart)`;
    for (const metodo of metodos) {
      const ruta = `${prefijo}${capa.route.path === "/" ? "" : capa.route.path}`;
      filas.push(`| ${metodo} | \`${ruta}\` | ${acceso} | ${descripcion} |`);
    }
  }
  return [
    `### ${titulo(prefijo)}`,
    "",
    "| Método | Ruta | Acceso | Descripción |",
    "|---|---|---|---|",
    ...filas,
    "",
  ].join("\n");
});

const documento = `# API de NailSoft

> Archivo generado con \`npm run docs:api\` a partir de las rutas reales. No lo edites a mano.

## Convenciones

- **Autenticación:** encabezado \`Authorization: Bearer <token>\`. El token se obtiene en \`POST /api/auth/login\` y dura 24 horas. Cambiar la contraseña invalida los tokens anteriores.
- **Permisos:** cada ruta indica los permisos que acepta; basta con tener uno. Los terminados en \`Propias\` limitan la acción a los registros del propio cliente o empleado (por ejemplo, con \`verCitasPropias\` un cliente solo recibe sus citas).
- **Errores:** siempre JSON con \`msg\` y \`message\` (el mismo texto). Las validaciones pueden incluir \`errores\` con el detalle.

| Código | Significado |
|---|---|
| 400 | Datos no válidos (incluye ids mal formados) |
| 401 | Sin sesión, token inválido o expirado, o cuenta desactivada (\`cuentaInactiva: true\`) |
| 403 | Falta el permiso (\`permisoNoAsignado\` o \`permisoDesactivado: true\`) o el rol está desactivado (\`rolDesactivado: true\`) |
| 404 | No existe o no está en el alcance del usuario |
| 409 | Conflicto: choque de horario, registro duplicado o eliminar algo con historial |
| 413 | Petición demasiado grande (JSON de más de 1 MB) |
| 429 | Demasiadas peticiones: 10 cada 15 minutos en login, registro y recuperación de contraseña |

- **Imágenes:** JPG, PNG, WEBP o GIF de hasta 5 MB. Se sirven en \`/uploads/<archivo>\`.
- **Horarios:** la agenda usa la hora local del spa (\`TZ\`, por defecto America/Bogota). Los clientes agendan entre 9:00 y 18:00.

## Rutas

${secciones.join("\n")}`;

fs.mkdirSync(path.join(raiz, "docs"), { recursive: true });
fs.writeFileSync(path.join(raiz, "docs", "API.md"), documento);
console.log(`docs/API.md: ${RUTAS.length} recursos`);
process.exit(0);
