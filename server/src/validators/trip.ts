import { z } from 'zod'

const tripFields = z.object({
  name: z.string().trim().min(1, 'Please enter a trip name.').max(100),
  destination: z.string().trim().min(1, 'Please enter a destination.').max(120),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  currency: z.string().length(3).transform((value) => value.toUpperCase()),
  coverImage: z.string().optional().default(''),
  quote: z.string().max(180).optional(),
})

export const tripCreateSchema = tripFields.refine((value) => value.endDate >= value.startDate, { path: ['endDate'], message: 'End date must be after start date.' })

export const tripUpdateSchema = tripFields.partial().refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
  path: ['endDate'], message: 'End date must be after start date.',
})

export const joinTripSchema = z.object({
  code: z.string().trim().min(1, 'Please enter an invitation code.').max(10).transform((value) => value.toUpperCase()),
})