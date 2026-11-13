type JsonRecord = Record<string, unknown>

export function normalizeExtendedJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeExtendedJson)
  if (!value || typeof value !== 'object') return value

  const record = value as JsonRecord
  if (typeof record.$oid === 'string') return record.$oid
  if ('$date' in record) {
    const raw = record.$date
    let date: Date
    if (raw && typeof raw === 'object' && '$numberLong' in raw) {
      const timestamp = (raw as JsonRecord).$numberLong
      const milliseconds = typeof timestamp === 'number'
        ? timestamp
        : typeof timestamp === 'string' && /^-?\d+$/.test(timestamp)
          ? Number(timestamp)
          : Number.NaN
      if (!Number.isSafeInteger(milliseconds)) throw new Error('invalid_date')
      date = new Date(milliseconds)
    } else if (typeof raw === 'string' || typeof raw === 'number') {
      date = new Date(raw)
    } else {
      throw new Error('invalid_date')
    }
    if (Number.isNaN(date.getTime())) throw new Error('invalid_date')
    return date
  }
  if ('$numberInt' in record || '$numberLong' in record || '$numberDouble' in record || '$numberDecimal' in record) {
    const number = Number(record.$numberInt ?? record.$numberLong ?? record.$numberDouble ?? record.$numberDecimal)
    if (!Number.isFinite(number)) throw new Error('invalid_number')
    return number
  }
  return Object.fromEntries(Object.entries(record).map(([key, item]) => [key, normalizeExtendedJson(item)]))
}
