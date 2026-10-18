import { useState, useEffect } from "react"
import { Moon, Sun } from "lucide-react"
import { getTheme, toggleTheme, setTheme } from "../util/theme-util"

const ThemeToggle = () => {
  const [theme, setThemeState] = useState("light")

  useEffect(() => {
    const currentTheme = getTheme()
    setThemeState(currentTheme)
    setTheme(currentTheme)
  }, [])

  const oscuro = theme === "dark"

  return (
    <button
      onClick={() => setThemeState(toggleTheme())}
      aria-label={oscuro ? "Usar tema claro" : "Usar tema oscuro"}
      title={oscuro ? "Tema claro" : "Tema oscuro"}
      className="boton-icono"
    >
      {oscuro ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
    </button>
  )
}

export default ThemeToggle
