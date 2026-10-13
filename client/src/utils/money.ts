export function formatMoney(minorUnits: number, currency = 'INR'): string {
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits
  const amount = minorUnits / (10 ** digits)
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : Math.min(2, digits),
    maximumFractionDigits: digits,
  }).format(amount)
}

export function toMinorUnits(majorUnits: number, currency: string): number {
  const digits = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits
  return Math.round(majorUnits * (10 ** digits))
}