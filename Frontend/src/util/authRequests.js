// Agrega el token JWT a todas las peticiones al backend, hechas con axios o con fetch,
// para que ninguna pantalla dependa de que el backend deje rutas abiertas.
import axios from "axios"

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL

const esDelBackend = (url) => typeof url === "string" && url.startsWith(BACKEND_URL)

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token && esDelBackend(config.url) && !config.headers?.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const fetchOriginal = window.fetch.bind(window)

window.fetch = (input, init = {}) => {
  const url = typeof input === "string" ? input : input?.url
  const token = localStorage.getItem("token")
  if (!token || !esDelBackend(url)) return fetchOriginal(input, init)

  const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined))
  if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`)
  return fetchOriginal(input, { ...init, headers })
}
