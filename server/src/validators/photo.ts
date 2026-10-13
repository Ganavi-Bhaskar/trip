import { z } from 'zod'

export const photoMetadataSchema = z.object({
  caption: z.string().max(300).optional().default(''),
  day: z.coerce.number().int().min(1).optional(),
  activity: z.string().regex(/^[a-f\d]{24}$/i).optional(),
})