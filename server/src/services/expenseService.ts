import { Expense } from '../models/Expense'
import { Membership } from '../models/Membership'
import { Trip } from '../models/Trip'
import { ApiError } from '../utils/ApiError'
import { computeShares, type SplitInput, type SplitType } from './splitService'
import { regeneratePendingSettlements } from './settlementService'

interface ExpenseInput {
  description: string
  amount: number
  currency: string
  exchangeRate?: number
  category: 'food' | 'stay' | 'transport' | 'activities' | 'shopping' | 'other'
  paidBy: string
  date: Date
  splitType: SplitType
  participants: string[]
  customSplits: SplitInput[]
}

async function validateMembers(tripId: string, payer: string, participants: string[]): Promise<void> {
  const ids = [...new Set([payer, ...participants])]
  const memberships = await Membership.find({ trip: tripId, user: { $in: ids } }).select('user').lean()
  if (memberships.length !== ids.length) throw new ApiError(400, 'Payer and split participants must be travelers on this trip.')
}

async function prepare(tripId: string, input: ExpenseInput) {
  const trip = await Trip.findById(tripId).select('currency')
  if (!trip) throw new ApiError(404, 'Trip not found.')
  const currency = input.currency.toUpperCase()
  const rate = currency === trip.currency ? 1 : input.exchangeRate
  if (!rate || rate <= 0) throw new ApiError(400, 'Enter a positive exchange rate for a different currency.', { exchangeRate: 'Exchange rate is required.' })
  const amountInTripCurrency = Math.round(input.amount * rate)
  if (!Number.isSafeInteger(amountInTripCurrency) || amountInTripCurrency < 1) throw new ApiError(400, 'Converted amount is invalid.')
  await validateMembers(tripId, input.paidBy, input.participants)
  const computedShares = computeShares(amountInTripCurrency, input.splitType, input.participants, input.customSplits)
  return { ...input, trip: tripId, currency, exchangeRate: rate, amountInTripCurrency, computedShares }
}

export async function listExpenses(tripId: string, category?: string) {
  return Expense.find({ trip: tripId, ...(category && category !== 'all' ? { category } : {}) })
    .populate('paidBy createdBy participants', 'name avatar').sort({ date: -1, createdAt: -1 }).lean()
}

export async function createExpense(tripId: string, userId: string, input: ExpenseInput) {
  const prepared = await prepare(tripId, input)
  const expense = await Expense.create({ ...prepared, createdBy: userId })
  await regeneratePendingSettlements(tripId)
  return expense
}

async function authorizeMutation(expenseId: string, userId: string) {
  const expense = await Expense.findById(expenseId)
  if (!expense) throw new ApiError(404, 'Expense not found.')
  const membership = await Membership.findOne({ trip: expense.trip, user: userId })
  if (!membership) throw new ApiError(403, 'You are not a traveler on this trip.')
  if (membership.role !== 'organizer' && String(expense.createdBy) !== userId) throw new ApiError(403, 'You can only change expenses you added.')
  return expense
}

export async function getExpense(expenseId: string, userId: string) {
  const expense = await Expense.findById(expenseId).populate('paidBy createdBy participants computedShares.user customSplits.user', 'name avatar')
  if (!expense) throw new ApiError(404, 'Expense not found.')
  const membership = await Membership.exists({ trip: expense.trip, user: userId })
  if (!membership) throw new ApiError(403, 'You are not a traveler on this trip.')
  return expense
}

export async function updateExpense(expenseId: string, userId: string, input: ExpenseInput) {
  const expense = await authorizeMutation(expenseId, userId)
  const prepared = await prepare(String(expense.trip), input)
  Object.assign(expense, prepared)
  await expense.save()
  await regeneratePendingSettlements(String(expense.trip))
  return expense
}

export async function deleteExpense(expenseId: string, userId: string) {
  const expense = await authorizeMutation(expenseId, userId)
  const tripId = String(expense.trip)
  await expense.deleteOne()
  await regeneratePendingSettlements(tripId)
}