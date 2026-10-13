import { z } from 'zod'

const fields = {
  description: z.string().trim().min(1, 'Please enter a description.').max(140),
  amount: z.number().int().positive('Amount must be greater than zero.'),
  currency: z.string().length(3).transform((value) => value.toUpperCase()),
  exchangeRate: z.number().positive().optional(),
  category: z.enum(['food', 'stay', 'transport', 'activities', 'shopping', 'other']),
  paidBy: z.string().regex(/^[a-f\d]{24}$/i, 'Choose who paid.'),
  date: z.coerce.date(),
  splitType: z.enum(['equal', 'custom', 'percentage', 'exact']),
  participants: z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1, 'Select at least one traveler.'),
  customSplits: z.array(z.object({ user: z.string().regex(/^[a-f\d]{24}$/i), value: z.number().nonnegative() })).optional().default([]),
}

export const expenseCreateSchema = z.object(fields)
export const expenseUpdateSchema = expenseCreateSchema