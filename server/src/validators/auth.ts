import { z } from 'zod'

const strongPassword = z.string().min(8, 'Password must be at least 8 characters.').regex(/[A-Za-z]/, 'Password must include a letter.').regex(/[0-9]/, 'Password must include a number.')
const email = z.string().trim().pipe(z.email('Enter a valid email address.'))

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your name.').max(80),
  email,
  password: strongPassword,
})
export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Please enter your password.'),
})