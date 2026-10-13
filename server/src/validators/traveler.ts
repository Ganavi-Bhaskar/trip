import { z } from 'zod'

export const travelerAddSchema = z.object({
  email: z.email('Enter a valid email address.'),
  name: z.string().trim().min(1).max(80).optional(),
  role: z.enum(['organizer', 'member']).optional().default('member'),
  preferences: z.array(z.string().trim().min(1).max(32)).max(12).optional().default([]),
})

export const travelerUpdateSchema = z.object({
  role: z.enum(['organizer', 'member']).optional(),
  preferences: z.array(z.string().trim().min(1).max(32)).max(12).optional(),
}).refine((value) => value.role !== undefined || value.preferences !== undefined, 'Update at least one traveler field.')