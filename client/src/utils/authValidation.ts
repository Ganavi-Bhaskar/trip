import { z } from 'zod'

const strongPassword = z.string().min(8, 'Use at least 8 characters.').regex(/[A-Za-z]/, 'Add a letter.').regex(/[0-9]/, 'Add a number.')
const email = z.string().trim().pipe(z.email('Enter a valid email address.'))

export function authFormSchema(mode: 'login' | 'register') {
  return z.object({
    name: z.string().trim().min(1, 'Please enter your name.').optional(),
    email,
    password: mode === 'register' ? strongPassword : z.string().min(1, 'Please enter your password.'),
  })
}
