import { describe, expect, it } from 'vitest'
import { formatMoney, toMinorUnits } from './money'

describe('currency boundary helpers', () => {
  it('converts rupees to paise and formats back', () => {
    expect(toMinorUnits(21600, 'INR')).toBe(2160000)
    expect(formatMoney(2160000, 'INR')).toContain('21,600')
    expect(formatMoney(2160000, 'INR')).not.toContain('.00')
  })

  it('respects currencies without fractional minor units', () => {
    expect(toMinorUnits(128, 'JPY')).toBe(128)
    expect(formatMoney(128, 'JPY')).toContain('128')
  })
})