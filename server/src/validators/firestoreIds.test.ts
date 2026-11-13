import { describe, expect, it } from 'vitest'
import { expenseCreateSchema } from './expense'
import { photoMetadataSchema } from './photo'

describe('Firestore document identifiers', () => {
  it('accepts Firestore-style identifiers in expenses and photo metadata', () => {
    const id = 'aFirestore_doc-id123'
    const expense = expenseCreateSchema.parse({
      description: 'Shared taxi',
      amount: 1250,
      currency: 'INR',
      category: 'transport',
      paidBy: id,
      date: '2026-11-11',
      splitType: 'equal',
      participants: [id],
    })
    expect(expense.paidBy).toBe(id)
    expect(photoMetadataSchema.parse({ activity: id }).activity).toBe(id)
  })

  it('rejects identifiers that could escape their Firestore document path', () => {
    expect(() => expenseCreateSchema.parse({
      description: 'Shared taxi',
      amount: 1250,
      currency: 'INR',
      category: 'transport',
      paidBy: 'trip/user',
      date: '2026-11-11',
      splitType: 'equal',
      participants: ['trip/user'],
    })).toThrow()
    expect(() => photoMetadataSchema.parse({ activity: 'trip/activity' })).toThrow()
  })
})
