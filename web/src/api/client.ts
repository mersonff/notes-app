import axios, { type AxiosInstance } from 'axios'

const apiBase = import.meta.env.VITE_API_URL ?? ''
const apiPrefix = '/api/v1'

export const apiClient: AxiosInstance = axios.create({
  baseURL: `${apiBase}${apiPrefix}`,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  // Surface real network errors to the caller (no silent retries).
  timeout: 10_000
})

// Forward the active locale so the Rails API picks the matching i18n
// scope and returns translated validation messages. The lang attribute
// is kept in sync with vue-i18n by main.ts (and by tests in setup.ts).
apiClient.interceptors.request.use((config) => {
  const lang = typeof document !== 'undefined' ? document.documentElement.lang : ''
  if (lang) {
    config.headers.set('Accept-Language', lang)
  }
  return config
})
