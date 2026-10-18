// Express 4 no atrapa los errores de las funciones async: una promesa rechazada sin catch
// tumba todo el proceso de Node. Este módulo envuelve los manejadores de un router para que
// cualquier error llegue a next(error) y lo responda el manejador de errores del servidor.

const envolver = (manejador) => {
  if (manejador.length === 4) return manejador; // ya es un manejador de errores
  const envuelto = function (req, res, next) {
    try {
      const resultado = manejador.call(this, req, res, next);
      if (resultado && typeof resultado.catch === "function") resultado.catch(next);
    } catch (error) {
      next(error);
    }
  };
  // Conserva nombre y marcas (permisos, campoImagen) que usa la documentación generada
  Object.defineProperty(envuelto, "name", { value: manejador.name });
  return Object.assign(envuelto, manejador);
};

const protegerRouter = (router) => {
  for (const capa of router.stack) {
    if (capa.route) {
      for (const paso of capa.route.stack) paso.handle = envolver(paso.handle);
    } else {
      capa.handle = envolver(capa.handle);
    }
  }
  return router;
};

module.exports = { protegerRouter };
