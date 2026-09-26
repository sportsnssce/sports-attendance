import axios from 'axios'
import { API_BASE_URL } from '@/lib/constants'

export interface StoredAuth {
  token: string
  username: string
  role: 'ROLE_ADMIN' | 'ROLE_CAPTAIN'
}

const api = axios.create({
  baseURL: API_BASE_URL,
})

// Request interceptor: inject Basic Auth from sessionStorage
api.interceptors.request.use((config) => {
  const raw = sessionStorage.getItem('auth')
  if (raw) {
    try {
      const { token } = JSON.parse(raw) as StoredAuth
      config.headers.Authorization = token
    } catch {
      // Corrupted sessionStorage — ignore
    }
  }
  return config
})

// Response interceptor: handle 401 → clear session and redirect only if unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (window.location.pathname !== '/login') {
        sessionStorage.removeItem('auth')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
