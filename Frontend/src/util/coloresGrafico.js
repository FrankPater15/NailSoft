import { useEffect, useState } from "react"

// Recharts dibuja SVG con colores en atributos, donde las variables CSS no funcionan:
// este hook entrega los colores del tema ya resueltos y se actualiza al cambiar de tema.
const leer = () => {
  const estilos = getComputedStyle(document.documentElement)
  const variable = (nombre) => estilos.getPropertyValue(nombre).trim()
  const rgb = (nombre) => `rgb(${variable(nombre)})`
  return {
    series: [variable("--graf-1"), variable("--graf-2"), variable("--graf-3"), variable("--graf-4")],
    tinta: rgb("--c-ink"),
    tintaSuave: rgb("--c-ink-soft"),
    tintaTenue: rgb("--c-ink-faint"),
    linea: rgb("--c-line"),
    superficie: rgb("--c-surface"),
  }
}

export const useColoresGrafico = () => {
  const [colores, setColores] = useState(leer)

  useEffect(() => {
    const observador = new MutationObserver(() => setColores(leer()))
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    // El tema pudo cambiar entre el primer render y este efecto (lo aplica ThemeToggle al montar)
    setColores(leer())
    return () => observador.disconnect()
  }, [])

  return colores
}
