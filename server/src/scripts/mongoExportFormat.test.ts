import { describe, expect, it } from 'vitest'
import { normalizeExtendedJson } from './mongoExportFormat'

describe('normalizeExtendedJson', () => {
  it('converts canonical epoch-millisecond date strings to Date values', () => {
    expect(normalizeExtendedJson({ createdAt: { $date: { $numberLong: '1700000000000' } } }))
      .toEqual({ createdAt: new Date(1700000000000) })
  })

  it('normalizes ObjectIds, dates, and numbers recursively in nested arrays', () => {
    expect(normalizeExtendedJson({
      participants: [{ user: { $oid: '507f1f77bcf86cd799439011' }, amount: { $numberInt: '125' } }],
      dates: [{ $date: '2024-01-02T03:04:05.000Z' }],
    })).toEqual({
      participants: [{ user: '507f1f77bcf86cd799439011', amount: 125 }],
      dates: [new Date('2024-01-02T03:04:05.000Z')],
    })
  })

  it('rejects invalid canonical date values', () => {
    expect(() => normalizeExtendedJson({ createdAt: { $date: { $numberLong: 'not-a-timestamp' } } }))
      .toThrow('invalid_date')
  })
})
