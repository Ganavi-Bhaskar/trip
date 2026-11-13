import { z } from 'zod'

export const photoMetadataSchema = z.object({
  caption: z.string().max(300).optional().default(''),
  day: z.coerce.number().int().min(1).optional(),
  activity: z.string().min(1).max(128).refine((value) => !value.includes('/')).optional(),
})