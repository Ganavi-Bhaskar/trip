import { getDb, emailDocumentId, fromSnapshot, membershipId } from '../config/firebase'
import { queryRecords, userByEmail } from '../utils/firestore'
import { ApiError } from '../utils/ApiError'

interface TravelerRecord { _id: string; trip: string; user: string; role: 'organizer' | 'member'; preferences: string[]; joinedAt: Date }
interface UserRecord { _id: string; name: string; email: string; avatar: string; isGuest: boolean }

async function hydrate(membership: TravelerRecord) {
  const user = await getDb().collection('users').doc(membership.user).get()
  const userData = fromSnapshot<Omit<UserRecord, '_id'>>(user)
  if (!userData) throw new Error(`Traveler ${membership.user} has no associated user record.`)
  return { ...membership, user: { ...userData, id: userData._id } }
}

export async function listTravelers(tripId: string) {
  const travelers = await queryRecords<TravelerRecord>(getDb().collection('travelers').where('trip', '==', tripId))
  travelers.sort((left, right) => new Date(left.joinedAt).getTime() - new Date(right.joinedAt).getTime())
  return Promise.all(travelers.map(hydrate))
}

export async function addTraveler(tripId: string, input: { email: string; name?: string; role: 'organizer' | 'member'; preferences: string[] }) {
  const database = getDb()
  const email = input.email.trim().toLowerCase()
  const emailRef = database.collection('userEmails').doc(emailDocumentId(email))
  const member = await database.runTransaction(async (transaction) => {
    const indexSnapshot = await transaction.get(emailRef)
    let userId: string
    let user: UserRecord
    if (indexSnapshot.exists) {
      userId = indexSnapshot.data()?.userId as string
      const userSnapshot = await transaction.get(database.collection('users').doc(userId))
      const data = fromSnapshot<Omit<UserRecord, '_id'>>(userSnapshot)
      if (!data) throw new Error('Email index points to a missing user record.')
      user = { ...data, _id: userId }
    } else {
      userId = database.collection('users').doc().id
      user = { _id: userId, name: input.name ?? email.split('@')[0] ?? 'Traveler', email, avatar: '', isGuest: true }
    }
    const membershipQuery = database.collection('travelers').where('trip', '==', tripId).where('user', '==', userId).limit(1)
    const membershipSnapshot = await transaction.get(membershipQuery)
    if (!membershipSnapshot.empty) throw new ApiError(409, 'This traveler is already on the trip.')
    const actualMembershipRef = database.collection('travelers').doc(membershipId(tripId, userId))
    const now = new Date()
    if (!indexSnapshot.exists) {
      transaction.create(database.collection('users').doc(userId), {
        ...user, preferences: { currency: 'INR', notifications: true, theme: 'system' }, createdAt: now, updatedAt: now,
      })
      transaction.create(emailRef, { userId })
    }
    const membership = { trip: tripId, user: userId, role: input.role, preferences: input.preferences, joinedAt: now, createdAt: now, updatedAt: now }
    transaction.create(actualMembershipRef, membership)
    return { ...membership, _id: actualMembershipRef.id, user: { ...user, id: userId } }
  })
  return member
}

export async function updateTraveler(tripId: string, userId: string, input: { role?: 'organizer' | 'member'; preferences?: string[] }) {
  const database = getDb()
  const memberQuery = database.collection('travelers').where('trip', '==', tripId).where('user', '==', userId).limit(1)
  const updated = await database.runTransaction(async (transaction) => {
    const members = await transaction.get(memberQuery)
    const snapshot = members.docs[0]
    if (!snapshot) throw new ApiError(404, 'Traveler not found.')
    const membership = fromSnapshot<TravelerRecord>(snapshot)
    if (!membership) throw new ApiError(404, 'Traveler not found.')
    if (input.role === 'member' && membership.role === 'organizer') {
      const organizers = await transaction.get(database.collection('travelers').where('trip', '==', tripId).where('role', '==', 'organizer'))
      if (organizers.size <= 1) throw new ApiError(409, 'A trip must always have at least one organizer.')
    }
    const next = { ...membership, ...input, updatedAt: new Date() }
    transaction.update(database.collection('travelers').doc(membership._id), {
      ...(input.role ? { role: input.role } : {}),
      ...(input.preferences ? { preferences: input.preferences } : {}),
      updatedAt: next.updatedAt,
    })
    return next
  })
  return hydrate(updated)
}

export async function removeTraveler(tripId: string, userId: string) {
  const database = getDb()
  await database.runTransaction(async (transaction) => {
    const [members, expenses, settlements] = await Promise.all([
      transaction.get(database.collection('travelers').where('trip', '==', tripId).where('user', '==', userId).limit(1)),
      transaction.get(database.collection('expenses').where('trip', '==', tripId)),
      transaction.get(database.collection('settlements').where('trip', '==', tripId)),
    ])
    const snapshot = members.docs[0]
    if (!snapshot) throw new ApiError(404, 'Traveler not found.')
    const membership = fromSnapshot<TravelerRecord>(snapshot)
    if (!membership) throw new ApiError(404, 'Traveler not found.')
    if (membership.role === 'organizer') {
      const organizers = await transaction.get(database.collection('travelers').where('trip', '==', tripId).where('role', '==', 'organizer'))
      if (organizers.size <= 1) throw new ApiError(409, 'A trip must always have at least one organizer.')
    }
    const referencedExpense = expenses.docs.some((document) => {
      const expense = document.data() as { paidBy?: string; participants?: string[]; computedShares?: Array<{ user: string }> }
      return expense.paidBy === userId || expense.participants?.includes(userId) || expense.computedShares?.some((share) => share.user === userId)
    })
    if (referencedExpense) throw new ApiError(409, 'This traveler is referenced by trip expenses. Update or delete those expenses first.')
    if (settlements.docs.some((document) => {
      const settlement = document.data() as { from?: string; to?: string }
      return settlement.from === userId || settlement.to === userId
    })) {
      throw new ApiError(409, 'This traveler is referenced by settlement history and cannot be removed.')
    }
    transaction.delete(snapshot.ref)
  })
}
