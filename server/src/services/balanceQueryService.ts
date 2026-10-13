import { Expense } from '../models/Expense'
import { Membership } from '../models/Membership'
import { Settlement } from '../models/Settlement'
import { User } from '../models/User'
import { Trip } from '../models/Trip'
import { computeBalances, minimizeTransactions } from './balanceService'

export async function getTripBalance(tripId: string) {
  const [trip, expenses, settled, pending, memberships] = await Promise.all([
    Trip.findById(tripId).select('currency'),
    Expense.find({ trip: tripId }).select('paidBy amountInTripCurrency computedShares').lean(),
    Settlement.find({ trip: tripId, status: 'settled' }).select('from to amount').lean(),
    Settlement.find({ trip: tripId, status: 'pending' }).select('from to amount status').lean(),
    Membership.find({ trip: tripId }).select('user').lean(),
  ])
  const memberIds = memberships.map((membership) => String(membership.user))
  const balances = computeBalances(expenses, settled, memberIds)
  const users = await User.find({ _id: { $in: memberIds } }).select('name avatar').lean()
  const userById = new Map(users.map((user) => [String(user._id), user]))
  const suggestions = minimizeTransactions(balances)
  const suggestedSettlements = suggestions.map((suggestion) => {
    const persisted = pending.find((entry) => String(entry.from) === suggestion.from && String(entry.to) === suggestion.to && entry.amount === suggestion.amount)
    return {
      id: persisted ? String(persisted._id) : '',
      amount: suggestion.amount,
      from: publicUser(userById.get(suggestion.from), suggestion.from),
      to: publicUser(userById.get(suggestion.to), suggestion.to),
      status: 'pending' as const,
    }
  })
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amountInTripCurrency, 0)
  return {
    currency: trip?.currency ?? 'INR',
    totalExpenses,
    balances: balances.map((balance) => ({ ...balance, user: publicUser(userById.get(balance.user), balance.user), status: balance.net > 0 ? 'gets back' : balance.net < 0 ? 'owes' : 'settled' })),
    suggestedSettlements,
    settlements: pending.map((settlement) => ({ ...settlement, id: String(settlement._id) })),
  }
}

function publicUser(user: { _id: unknown; name: string; avatar?: string } | undefined, id: string) {
  return { id, name: user?.name ?? 'Traveler', avatar: user?.avatar ?? '' }
}