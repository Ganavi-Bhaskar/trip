import { Types } from 'mongoose'
import { Membership } from '../models/Membership'
import { Expense } from '../models/Expense'
import { Settlement } from '../models/Settlement'
import { ApiError } from '../utils/ApiError'
import { computeBalances, minimizeTransactions } from './balanceService'

export async function regeneratePendingSettlements(tripId: string): Promise<void> {
  const [expenses, settled, memberships] = await Promise.all([
    Expense.find({ trip: tripId }).select('paidBy amountInTripCurrency computedShares').lean(),
    Settlement.find({ trip: tripId, status: 'settled' }).select('from to amount').lean(),
    Membership.find({ trip: tripId }).select('user').lean(),
  ])
  const balances = computeBalances(expenses, settled, memberships.map((membership) => String(membership.user)))
  const suggestions = minimizeTransactions(balances)
  await Settlement.deleteMany({ trip: tripId, status: 'pending' })
  if (suggestions.length) {
    await Settlement.insertMany(suggestions.map((suggestion) => ({ trip: tripId, ...suggestion, status: 'pending' })))
  }
}

export async function getSettlements(tripId: string) {
  return Settlement.find({ trip: tripId }).populate('from to settledBy', 'name avatar').sort({ status: 1, createdAt: 1 }).lean()
}

export async function settle(settlementId: string, userId: string): Promise<void> {
  const settlement = await Settlement.findById(settlementId)
  if (!settlement) throw new ApiError(404, 'Settlement not found.')
  if (settlement.status === 'settled') throw new ApiError(409, 'This settlement is already complete.')
  const membership = await Membership.findOne({ trip: settlement.trip, user: userId })
  if (!membership) throw new ApiError(403, 'You are not a traveler on this trip.')
  if (membership.role !== 'organizer' && String(settlement.from) !== userId && String(settlement.to) !== userId) {
    throw new ApiError(403, 'Only the travelers involved or an organizer can mark this settlement complete.')
  }
  settlement.status = 'settled'
  settlement.settledAt = new Date()
    settlement.settledBy = new Types.ObjectId(userId)
  await settlement.save()
  await regeneratePendingSettlements(String(settlement.trip))
}