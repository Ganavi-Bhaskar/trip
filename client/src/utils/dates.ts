export function formatDate(value: string | Date, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }): string {
  const date = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date(value)
  return new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(date)
}

export function inclusiveDays(start: string | Date, end: string | Date): number {
  const asUtc = (value: string | Date) => {
    const date = new Date(value)
    return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  }
  return Math.floor((asUtc(end) - asUtc(start)) / 86400000) + 1
}

export function tripDateForDay(start: string | Date, day: number): Date {
  const date = new Date(start)
  date.setUTCDate(date.getUTCDate() + day - 1)
  return date
}

export function formatTime(value: string): string {
  const [hours = 0, minutes = 0] = value.split(':').map(Number)
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).format(new Date(Date.UTC(2020, 0, 1, hours, minutes)))
}