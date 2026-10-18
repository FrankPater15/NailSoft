"use client"

import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { enlaceWhatsapp, enlaceInstagram, CONTACTO } from "../../config/contacto"
import "./index.css"

const API = import.meta.env.VITE_BACKEND_URL
const foto = (archivo) => `${API}/uploads/${archivo}`

const FOTOS_PORTADA = ["ImgFdo14.jpg", "imgFdo3.jpg", "ImgFdo15.jpg"]
const FOTOS_GALERIA = ["ImgFdo5.jpeg", "ImgFdo6.jpg", "img3.jpg", "img1.jpg", "img4.jpg", "img5.jpg"]

const pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })

const PASOS = [
  ["Crea tu cuenta", "Solo necesitas tu nombre, correo y celular."],
  ["Elige servicio, profesional y hora", "Ves los horarios libres de cada profesional y apartas el tuyo."],
  ["Llega a tu cita", "Puedes revisar o cancelar tus citas cuando quieras desde Mis citas."],
]

// Carta de servicios agrupada por categoría, con datos reales del spa
function CartaServicios() {
  const [servicios, setServicios] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`${API}/api/catalogo`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((datos) => setServicios(datos.servicios))
      .catch(() => setError(true))
  }, [])

  const categorias = useMemo(() => {
    const grupos = new Map()
    for (const s of servicios || []) {
      const nombre = s.categoria || "Otros servicios"
      if (!grupos.has(nombre)) grupos.set(nombre, [])
      grupos.get(nombre).push(s)
    }
    return [...grupos]
  }, [servicios])

  if (error) {
    return <p className="carta-vacia">No pudimos cargar la carta. Escríbenos por WhatsApp y te contamos los precios.</p>
  }
  if (!servicios) {
    return (
      <div className="carta" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="carta-cargando" />
        ))}
      </div>
    )
  }
  if (servicios.length === 0) {
    return <p className="carta-vacia">Pronto publicaremos nuestros servicios.</p>
  }

  return (
    <div className="carta">
      {categorias.map(([categoria, lista]) => (
        <section key={categoria} className="carta-grupo" aria-labelledby={`cat-${categoria}`}>
          <h3 id={`cat-${categoria}`} className="carta-categoria font-marca">
            {categoria}
          </h3>
          <ul>
            {lista.map((s) => (
              <li key={s._id} className="carta-item">
                <div className="carta-linea">
                  <span className="carta-nombre">{s.nombreServicio}</span>
                  <span className="carta-puntos" aria-hidden="true" />
                  <span className="carta-precio">
                    {s.promocion && <s>{pesos.format(s.precio)}</s>}
                    {pesos.format(s.precioFinal)}
                  </span>
                </div>
                <p className="carta-detalle">
                  {s.descripcion && <span>{s.descripcion}</span>}
                  <span className="carta-tiempo">{s.tiempo} min</span>
                  {s.promocion && (
                    <span className="carta-promo">
                      {s.promocion.nombre}: {s.promocion.descuento}% menos
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export default function Index() {
  const { user } = useAuth()
  const destinoReserva = user ? "/seleccionarservicios" : "/register"

  return (
    <div className="landing">
      <section className="portada">
        <div className="portada-texto">
          <h1 className="portada-titulo font-marca">Tus uñas, a tu hora.</h1>
          <p className="portada-bajada">
            Elige el servicio, la profesional y el horario que te queden bien. Te esperamos en {CONTACTO.nombre}.
          </p>
          <div className="portada-acciones">
            <Link to={destinoReserva} className="btn btn-primary btn-lg">
              Reservar cita
            </Link>
            <a href="#servicios" className="btn btn-secondary btn-lg">
              Ver precios
            </a>
          </div>
        </div>

        <div className="portada-unas" aria-hidden="true">
          {FOTOS_PORTADA.map((archivo, i) => (
            <div key={archivo} className={`portada-una forma-una portada-una-${i + 1}`}>
              <img src={foto(archivo)} alt="" loading={i === 0 ? "eager" : "lazy"} />
            </div>
          ))}
        </div>
      </section>

      <section id="servicios" className="seccion">
        <div className="seccion-cabecera">
          <h2 className="seccion-titulo">Carta de servicios</h2>
          <p className="seccion-bajada">Precios vigentes. La duración es aproximada y depende del diseño.</p>
        </div>
        <CartaServicios />
      </section>

      <section className="seccion">
        <div className="seccion-cabecera">
          <h2 className="seccion-titulo">Cómo reservar</h2>
        </div>
        <ol className="pasos">
          {PASOS.map(([titulo, texto], i) => (
            <li key={titulo} className="paso">
              <span className="paso-numero font-marca">{i + 1}</span>
              <h3 className="paso-titulo">{titulo}</h3>
              <p className="paso-texto">{texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="seccion">
        <div className="seccion-cabecera">
          <h2 className="seccion-titulo">Trabajos recientes</h2>
          <a href={enlaceInstagram()} target="_blank" rel="noopener noreferrer" className="seccion-enlace">
            Ver más en Instagram
          </a>
        </div>
        <div className="galeria">
          {FOTOS_GALERIA.map((archivo) => (
            <img key={archivo} src={foto(archivo)} alt="Uñas decoradas en S&B Spa y Belleza" loading="lazy" />
          ))}
        </div>
      </section>

      <section className="seccion antes-cita">
        <div className="seccion-cabecera">
          <h2 className="seccion-titulo">Antes de tu cita</h2>
        </div>
        <dl className="antes-lista">
          <div>
            <dt>Formas de pago</dt>
            <dd>Efectivo, tarjeta débito o crédito y transferencia.</dd>
          </div>
          <div>
            <dt>Cambios y cancelaciones</dt>
            <dd>Cancela desde Mis citas. Si necesitas cambiar la hora, escríbenos por WhatsApp.</dd>
          </div>
          <div>
            <dt>Dónde estamos</dt>
            <dd>
              {CONTACTO.direccion}. {CONTACTO.referencia}
            </dd>
          </div>
          <div>
            <dt>Llegada</dt>
            <dd>
              Llega unos minutos antes. Si te retrasas, tu servicio puede acortarse para no afectar la siguiente cita.
            </dd>
          </div>
        </dl>
      </section>

      <section className="cierre">
        <h2 className="cierre-titulo font-marca">¿Tienes dudas sobre un diseño?</h2>
        <p className="cierre-texto">Mándanos una foto de lo que quieres y te decimos cuánto tiempo y cuánto cuesta.</p>
        <div className="portada-acciones">
          <a href={enlaceWhatsapp()} target="_blank" rel="noopener noreferrer" className="btn btn-lg cierre-boton">
            Escribir por WhatsApp
          </a>
          <Link to={destinoReserva} className="btn btn-lg cierre-boton-secundario">
            Reservar cita
          </Link>
        </div>
      </section>
    </div>
  )
}
