import { describe, expect, it } from 'vitest'
import { authFormSchema } from './authValidation'

describe('authentication form validation', () => {
  it('accepts an existing non-empty password during login and trims the email', () => {
    const result = authFormSchema('login').safeParse({ email: '  GANAVI@TRIPSPLIT.DEV  ', password: 'short' })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe('GANAVI@TRIPSPLIT.DEV')
  })

  it('keeps strong password requirements for registration', () => {
    const result = authFormSchema('register').safeParse({ name: 'Ganavi', email: 'ganavi@tripsplit.dev', password: 'short' })

    expect(result.success).toBe(false)
  })
})
