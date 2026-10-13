const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api'
const mediaBase = apiBase.replace(/\/api\/?$/, '')

export function mediaUrl(url?: string | null): string {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return new URL(url, `${mediaBase}/`).toString()
}