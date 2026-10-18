// Datos de contacto del spa: se usan en la landing, el pie de página y el botón de WhatsApp.
// WhatsApp necesita el número en formato internacional (57 = Colombia) para abrir el chat.
export const CONTACTO = {
  nombre: "S&B Spa y Belleza",
  whatsapp: "573015789978",
  instagram: "belleza_spacol",
  // Tomada del aviso de ubicación publicado por el spa
  direccion: "Carrera 92 #78A-93, Robledo Aures, Medellín",
  referencia: "Estamos dentro de una barbería. No hacemos servicios a domicilio.",
}

export const enlaceWhatsapp = (mensaje = "Hola, quiero reservar una cita en S&B Spa y Belleza") =>
  `https://wa.me/${CONTACTO.whatsapp}?text=${encodeURIComponent(mensaje)}`

export const enlaceInstagram = () => `https://www.instagram.com/${CONTACTO.instagram}/`
