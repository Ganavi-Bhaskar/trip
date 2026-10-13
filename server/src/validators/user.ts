import { z } from 'zod'

const password = z.string().min(8, 'Password must be at least 8 characters.').regex(/[A-Za-z]/, 'Password must include a letter.').regex(/[0-9]/, 'Password must include a number.')

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  avatar: z.string().optional(),
  preferences: z.object({
    currency: z.string().length(3).optional(),
    notifications: z.boolean().optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
  }).optional(),
}).refine((value) => Object.keys(value).length > 0, 'Update at least one profile field.')

export const passwordChangeSchema = z.object({ currentPassword: z.string().min(1), newPassword: password })
export const accountDeleteSchema = z.object({ password: z.string().min(1) })