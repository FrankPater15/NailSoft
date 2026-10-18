const crypto = require("crypto")
const fs = require("fs")
const path = require("path")
const multer = require("multer")

const CARPETA_UPLOADS = path.join(__dirname, "../uploads")
const TAMANO_MAXIMO = 5 * 1024 * 1024 // 5 MB

// Extensión con la que se guarda cada tipo permitido (nunca la que manda el usuario)
const EXTENSIONES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
}

const upload = multer({
  storage: multer.diskStorage({
    destination: CARPETA_UPLOADS,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${EXTENSIONES[file.mimetype]}`),
  }),
  limits: { fileSize: TAMANO_MAXIMO, files: 1 },
  fileFilter: (req, file, cb) => {
    if (EXTENSIONES[file.mimetype]) return cb(null, true)
    cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname))
  },
})

// Middleware para un campo de imagen opcional. Va después de verificar permisos
// para que nadie sin permiso pueda escribir archivos en el servidor.
const subirImagen = (campo) => (req, res, next) => {
  upload.single(campo)(req, res, (error) => {
    // Si la petición termina en error (p. ej. falla la validación), no deja la imagen huérfana
    if (req.file) {
      res.on("finish", () => {
        if (res.statusCode >= 400) fs.unlink(req.file.path, () => {})
      })
    }
    if (!error) return next()
    if (error instanceof multer.MulterError) {
      const msg =
        error.code === "LIMIT_FILE_SIZE"
          ? "La imagen no puede pesar más de 5 MB"
          : "Solo se permiten imágenes JPG, PNG, WEBP o GIF"
      return res.status(400).json({ msg })
    }
    next(error)
  })
}

module.exports = { subirImagen, CARPETA_UPLOADS }
