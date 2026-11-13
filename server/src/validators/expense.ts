import { z } from 'zod'

const fields = {
  description: z.string().trim().min(1, 'Please enter a description.').max(140),
  amount: z.number().int().positive('Amount must be greater than zero.'),
  currency: z.string().length(3).transform((value) => value.toUpperCase()),
  exchangeRate: z.number().positive().optional(),
  category: z.enum(['food', 'stay', 'transport', 'activities', 'shopping', 'other']),
  paidBy: z.string().min(1).max(128).refine((value) => !value.includes('/'), 'Choose who paid.'),
  date: z.coerce.date(),
  splitType: z.enum(['equal', 'custom', 'percentage', 'exact']),
  participants: z.array(z.string().min(1).max(128).refine((value) => !value.includes('/'))).min(1, 'Select at least one traveler.'),
  customSplits: z.array(z.object({ user: z.string().min(1).max(128).refine((value) => !value.includes('/')), value: z.number().nonnegative() })).optional().default([]),
}

export const expenseCreateSchema = z.object(fields)
export const expenseUpdateSchema = expenseCreateSchema