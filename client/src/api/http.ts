import axios from 'axios'

export interface ApiEnvelope<T> {
  success: boolean
  data: T
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api',
  timeout: 15000,
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('tripsplit-token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use((response) => response, (error: unknown) => {
  if (axios.isAxiosError(error) && error.response?.status === 401) {
    const url = error.config?.url ?? ''
    if (!url.includes('/auth/login') && !url.includes('/auth/register')) {
      localStorage.removeItem('tripsplit-token')
      window.dispatchEvent(new Event('tripsplit:unauthorized'))
    }
  }
  return Promise.reject(error)
})

export function errorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) return error.response?.data?.message ?? 'We could not complete that request. Please try again.'
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}