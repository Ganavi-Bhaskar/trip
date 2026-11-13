import { getDb } from '../config/firebase'
import { queryRecords, userWithId } from '../utils/firestore'
import { computeBalances, minimizeTransactions } from './balanceService'

interface ExpenseRecord { _id: string; trip: string; paidBy: string; amountInTripCurrency: number; computedShares: Array<{ user: string; amount: number }> }
interface SettlementRecord { _id: string; trip: string; from: string; to: string; amount: number; status: 'pending' | 'settled' }
interface MembershipRecord { _id: string; user: string; trip: string }

export async function getTripBalance(tripId: string) {
  const database = getDb()
  const [trip, expenses, settlements, memberships] = await Promise.all([
    database.collection('trips').doc(tripId).get(),
    queryRecords<ExpenseRecord>(database.collection('expenses').where('trip', '==', tripId)),
    queryRecords<SettlementRecord>(database.collection('settlements').where('trip', '==', tripId)),
    queryRecords<MembershipRecord>(database.collection('travelers').where('trip', '==', tripId)),
  ])
  const memberIds = memberships.map((membership) => membership.user)
  const settled = settlements.filter((entry) => entry.status === 'settled')
  const pending = settlements.filter((entry) => entry.status === 'pending')
  const balances = computeBalances(expenses, settled, memberIds)
  const users = await Promise.all(memberIds.map(async (id) => [id, await userWithId(id)] as const))
  const userById = new Map(users)
  const suggestions = minimizeTransactions(balances)
  const suggestedSettlements = suggestions.map((suggestion) => {
    const persisted = pending.find((entry) => entry.from === suggestion.from && entry.to === suggestion.to && entry.amount === suggestion.amount)
    return {
      id: persisted?._id ?? '',
      amount: suggestion.amount,
      from: publicUser(userById.get(suggestion.from), suggestion.from),
      to: publicUser(userById.get(suggestion.to), suggestion.to),
      status: 'pending' as const,
    }
  })
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amountInTripCurrency, 0)
  return {
    currency: trip.data()?.currency ?? 'INR',
    totalExpenses,
    balances: balances.map((balance) => ({ ...balance, user: publicUser(userById.get(balance.user), balance.user), status: balance.net > 0 ? 'gets back' : balance.net < 0 ? 'owes' : 'settled' })),
    suggestedSettlements,
    settlements: pending.map((settlement) => ({ ...settlement, id: settlement._id })),
  }
}

function publicUser(user: { _id: string; name: string; avatar?: string } | null | undefined, id: string) {
  return { id, name: user?.name ?? 'Traveler', avatar: user?.avatar ?? '' }
}
