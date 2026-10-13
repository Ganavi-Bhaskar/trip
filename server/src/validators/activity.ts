import { z } from 'zod'

const activityFields = {
  day: z.number().int().min(1),
  title: z.string().trim().min(1, 'Please enter an activity name.').max(120),
  description: z.string().max(1000).optional().default(''),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Enter a valid time.'),
  location: z.string().max(160).optional().default(''),
  category: z.enum(['transport', 'food', 'stay', 'activity', 'sightseeing', 'shopping', 'other']),
  icon: z.string().max(40).optional().default(''),
  image: z.string().optional().default(''),
}
export const activityCreateSchema = z.object(activityFields)
export const activityUpdateSchema = z.object({
  day: activityFields.day.optional(),
  title: activityFields.title.optional(),
  description: activityFields.description.optional(),
  time: activityFields.time.optional(),
  location: activityFields.location.optional(),
  category: activityFields.category.optional(),
  icon: activityFields.icon.optional(),
  image: activityFields.image.optional(),
}).refine((value) => Object.keys(value).length > 0, 'Update at least one activity field.')