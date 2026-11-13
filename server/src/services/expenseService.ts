import { getDb, fromQuery, fromSnapshot } from '../config/firebase'
import { queryRecords, userWithId } from '../utils/firestore'
import { ApiError } from '../utils/ApiError'
import { computeShares, type SplitInput, type SplitType } from './splitService'
import { deleteExpenseAndReconcile, saveExpenseAndReconcile } from './settlementService'

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
interface TripRecord { _id: string; currency: string }
interface ExpenseRecord extends Record<string, unknown> {
  _id: string
  trip: string
  date: Date
  createdAt: Date
  paidBy: string
  createdBy: string
  participants: string[]
  customSplits: Array<{ user: string; value: number }>
  computedShares: Array<{ user: string; amount: number }>
}

async function prepare(tripId: string, input: ExpenseInput) {
  const trip = fromSnapshot<TripRecord>(await getDb().collection('trips').doc(tripId).get())
  if (!trip) throw new ApiError(404, 'Trip not found.')
  const currency = input.currency.toUpperCase()
  const rate = currency === trip.currency ? 1 : input.exchangeRate
  if (!rate || rate <= 0) throw new ApiError(400, 'Enter a positive exchange rate for a different currency.', { exchangeRate: 'Exchange rate is required.' })
  const amountInTripCurrency = Math.round(input.amount * rate)
  if (!Number.isSafeInteger(amountInTripCurrency) || amountInTripCurrency < 1) throw new ApiError(400, 'Converted amount is invalid.')
  const computedShares = computeShares(amountInTripCurrency, input.splitType, input.participants, input.customSplits)
  return { ...input, trip: tripId, currency, exchangeRate: rate, amountInTripCurrency, computedShares }
}

async function hydrate(expense: ExpenseRecord) {
  const resolve = async (id: string) => await userWithId(id) ?? id
  const [paidBy, createdBy, participants, computedShares, customSplits] = await Promise.all([
    resolve(expense.paidBy),
    resolve(expense.createdBy),
    Promise.all(expense.participants.map(resolve)),
    Promise.all(expense.computedShares.map(async (share) => ({ ...share, user: await resolve(share.user) }))),
    Promise.all(expense.customSplits.map(async (split) => ({ ...split, user: await resolve(split.user) }))),
  ])
  return { ...expense, paidBy, createdBy, participants, computedShares, customSplits }
}

export async function listExpenses(tripId: string, category?: string) {
  const query = getDb().collection('expenses').where('trip', '==', tripId)
  const expenses = await queryRecords<ExpenseRecord>(category && category !== 'all' ? query.where('category', '==', category) : query)
  expenses.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime() || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
  return Promise.all(expenses.map(hydrate))
}

export async function createExpense(tripId: string, userId: string, input: ExpenseInput) {
  const prepared = await prepare(tripId, input)
  const reference = getDb().collection('expenses').doc()
  const now = new Date()
  await saveExpenseAndReconcile(tripId, 'create', reference.id, { ...prepared, createdBy: userId, createdAt: now, updatedAt: now })
  return getExpense(reference.id, userId)
}

export async function getExpense(expenseId: string, userId: string) {
  const expense = fromSnapshot<ExpenseRecord>(await getDb().collection('expenses').doc(expenseId).get())
  if (!expense) throw new ApiError(404, 'Expense not found.')
  const membership = await getDb().collection('travelers').where('trip', '==', expense.trip).where('user', '==', userId).limit(1).get()
  if (membership.empty) throw new ApiError(403, 'You are not a traveler on this trip.')
  return hydrate(expense)
}

async function authorizeMutation(expenseId: string, userId: string) {
  const expense = fromSnapshot<ExpenseRecord>(await getDb().collection('expenses').doc(expenseId).get())
  if (!expense) throw new ApiError(404, 'Expense not found.')
  const memberQuery = await getDb().collection('travelers').where('trip', '==', expense.trip).where('user', '==', userId).limit(1).get()
  const membership = memberQuery.docs[0]?.data() as { role: 'organizer' | 'member' } | undefined
  if (!membership) throw new ApiError(403, 'You are not a traveler on this trip.')
  if (membership.role !== 'organizer' && expense.createdBy !== userId) throw new ApiError(403, 'You can only change expenses you added.')
  return expense
}

export async function updateExpense(expenseId: string, userId: string, input: ExpenseInput) {
  const expense = await authorizeMutation(expenseId, userId)
  const prepared = await prepare(expense.trip, input)
  await saveExpenseAndReconcile(expense.trip, 'update', expenseId, { ...prepared, createdBy: expense.createdBy })
  return getExpense(expenseId, userId)
}

export async function deleteExpense(expenseId: string, userId: string) {
  const expense = await authorizeMutation(expenseId, userId)
  await deleteExpenseAndReconcile(expense.trip, expenseId)
}
