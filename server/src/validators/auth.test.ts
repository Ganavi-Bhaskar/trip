import { describe, expect, it } from 'vitest'
import { loginSchema, registerSchema } from './auth'

describe('authentication request validation', () => {
  it('trims login email and accepts any non-empty existing password', () => {
    expect(loginSchema.parse({ email: '  GANAVI@TRIPSPLIT.DEV ', password: 'legacy' })).toEqual({
      email: 'GANAVI@TRIPSPLIT.DEV',
      password: 'legacy',
    })
  })

  it('requires a strong password for registration', () => {
    expect(registerSchema.safeParse({ name: 'Ganavi', email: 'ganavi@tripsplit.dev', password: 'legacy' }).success).toBe(false)
  })
})
