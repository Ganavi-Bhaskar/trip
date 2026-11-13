import { getDb, fromQuery, fromSnapshot } from '../config/firebase'
import { queryRecords, userWithId } from '../utils/firestore'
import { ApiError } from '../utils/ApiError'
import { computeBalances, minimizeTransactions } from './balanceService'
import type { BalanceExpense, BalanceSettlement } from './balanceService'

interface MembershipRecord { _id: string; user: string; trip: string; role: 'organizer' | 'member' }
interface SettlementRecord { _id: string; trip: string; from: string; to: string; amount: number; status: 'pending' | 'settled'; createdAt: Date; settledAt?: Date; settledBy?: string }
interface ExpenseMutation { kind: 'create' | 'update' | 'delete'; id: string; data?: Record<string, unknown> }

async function reconcile(tripId: string, mutation?: ExpenseMutation): Promise<void> {
  const database = getDb()
  await database.runTransaction(async (transaction) => {
    const [expenseQuery, settlementQuery, memberQuery] = await Promise.all([
      transaction.get(database.collection('expenses').where('trip', '==', tripId)),
      transaction.get(database.collection('settlements').where('trip', '==', tripId)),
      transaction.get(database.collection('travelers').where('trip', '==', tripId)),
    ])
    const expenses = fromQuery<BalanceExpense & Record<string, unknown>>(expenseQuery)
    const settlements = fromQuery<SettlementRecord>(settlementQuery)
    const members = fromQuery<MembershipRecord>(memberQuery)
    const memberIds = members.map((member) => member.user)
    if (mutation && mutation.kind !== 'create' && !expenses.some((expense) => expense._id === mutation.id)) {
      throw new ApiError(404, 'Expense not found.')
    }
    if (mutation?.data) {
      const payer = String(mutation.data.paidBy ?? '')
      const participants = mutation.data.participants as string[]
      if (![payer, ...participants].every((id) => memberIds.includes(id))) {
        throw new ApiError(400, 'Payer and split participants must be travelers on this trip.')
      }
    }

    let updatedExpenses: Array<BalanceExpense & Record<string, unknown> & { _id: string }> = expenses.filter((expense) => expense._id !== mutation?.id)
    if (mutation?.data) updatedExpenses = [...updatedExpenses, { ...mutation.data, _id: mutation.id } as unknown as BalanceExpense & Record<string, unknown> & { _id: string }]
    const existingSettled = settlements.filter((settlement) => settlement.status === 'settled')
    const suggested = minimizeTransactions(computeBalances(
      updatedExpenses,
      existingSettled,
      memberIds,
    ))
    const pending = settlements.filter((settlement) => settlement.status === 'pending')
    const writeCount = pending.length + suggested.length + (mutation ? 1 : 0)
    if (writeCount > 450) throw new ApiError(409, 'This trip has too many financial records to update in one transaction.')

    for (const settlement of pending) transaction.delete(database.collection('settlements').doc(settlement._id))
    if (mutation) {
      const expenseRef = database.collection('expenses').doc(mutation.id)
      if (mutation.kind === 'delete') transaction.delete(expenseRef)
      else if (mutation.kind === 'create') {
        const now = new Date()
        transaction.create(expenseRef, { ...mutation.data, createdAt: now, updatedAt: now })
      } else {
        const existing = expenses.find((expense) => expense._id === mutation.id) as (BalanceExpense & Record<string, unknown> & { createdAt?: Date }) | undefined
        transaction.set(expenseRef, { ...mutation.data, createdAt: existing?.createdAt, updatedAt: new Date() })
      }
    }
    const now = new Date()
    for (const suggestion of suggested) {
      const ref = database.collection('settlements').doc()
      transaction.create(ref, { trip: tripId, ...suggestion, status: 'pending', createdAt: now, updatedAt: now })
    }
  })
}

export async function saveExpenseAndReconcile(tripId: string, kind: 'create' | 'update', id: string, data: Record<string, unknown>) {
  await reconcile(tripId, { kind, id, data })
}

export async function deleteExpenseAndReconcile(tripId: string, id: string) {
  await reconcile(tripId, { kind: 'delete', id })
}

export async function regeneratePendingSettlements(tripId: string): Promise<void> {
  await reconcile(tripId)
}

export async function getSettlements(tripId: string) {
  const settlements = await queryRecords<SettlementRecord>(getDb().collection('settlements').where('trip', '==', tripId))
  settlements.sort((left, right) => left.status.localeCompare(right.status) || new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime())
  return Promise.all(settlements.map(async (settlement) => ({
    ...settlement,
    from: await userWithId(settlement.from) ?? settlement.from,
    to: await userWithId(settlement.to) ?? settlement.to,
    ...(settlement.settledBy ? { settledBy: await userWithId(settlement.settledBy) ?? settlement.settledBy } : {}),
  })))
}

export async function settle(settlementId: string, userId: string): Promise<void> {
  const database = getDb()
  await database.runTransaction(async (transaction) => {
    const settlementRef = database.collection('settlements').doc(settlementId)
    const settlementSnapshot = await transaction.get(settlementRef)
    const settlement = fromSnapshot<SettlementRecord>(settlementSnapshot)
    if (!settlement) throw new ApiError(404, 'Settlement not found.')
    if (settlement.status === 'settled') throw new ApiError(409, 'This settlement is already complete.')

    const [memberQuery, expenseQuery, settlementQuery, allMembers] = await Promise.all([
      transaction.get(database.collection('travelers').where('trip', '==', settlement.trip).where('user', '==', userId)),
      transaction.get(database.collection('expenses').where('trip', '==', settlement.trip)),
      transaction.get(database.collection('settlements').where('trip', '==', settlement.trip)),
      transaction.get(database.collection('travelers').where('trip', '==', settlement.trip)),
    ])
    const membership = fromQuery<MembershipRecord>(memberQuery)[0]
    if (!membership) throw new ApiError(403, 'You are not a traveler on this trip.')
    if (membership.role !== 'organizer' && settlement.from !== userId && settlement.to !== userId) {
      throw new ApiError(403, 'Only the travelers involved or an organizer can mark this settlement complete.')
    }
    const expenses = fromQuery<BalanceExpense & Record<string, unknown>>(expenseQuery)
    const settlements = fromQuery<SettlementRecord>(settlementQuery)
    const members = fromQuery<MembershipRecord>(allMembers)
    const settled = settlements.filter((entry) => entry.status === 'settled')
    settled.push({ ...settlement, status: 'settled' })
    const suggested = minimizeTransactions(computeBalances(expenses, settled, members.map((entry) => entry.user)))
    const pending = settlements.filter((entry) => entry.status === 'pending' && entry._id !== settlementId)
    if (pending.length + suggested.length > 450) throw new ApiError(409, 'This trip has too many financial records to settle in one transaction.')

    pending.forEach((entry) => transaction.delete(database.collection('settlements').doc(entry._id)))
    transaction.update(settlementRef, { status: 'settled', settledAt: new Date(), settledBy: userId, updatedAt: new Date() })
    const now = new Date()
    suggested.forEach((entry) => transaction.create(database.collection('settlements').doc(), {
      trip: settlement.trip, ...entry, status: 'pending', createdAt: now, updatedAt: now,
    }))
  })
}
