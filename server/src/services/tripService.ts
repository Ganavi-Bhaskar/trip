import { getDb, fromQuery, fromSnapshot, membershipId } from '../config/firebase'
import { queryRecords, userWithId } from '../utils/firestore'
import { storageProvider } from './storage'
import { ApiError } from '../utils/ApiError'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
type TripRecord = { _id: string; name: string; destination: string; startDate: Date; endDate: Date; currency: string; coverImage: string; quote: string; organizer: string; invitationCode?: string; invitationActive?: boolean }
type MembershipRecord = { _id: string; trip: string; user: string; role: 'organizer' | 'member'; preferences?: string[]; joinedAt?: Date }

export function generateInvitationCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  return code
}

async function reserveTrip(tripRef: FirebaseFirestore.DocumentReference, userId: string, input: Record<string, unknown>, code?: string) {
  const database = getDb()
  for (let attempts = 0; attempts < 10; attempts++) {
    const invitationCode = code ?? generateInvitationCode()
    const codeRef = database.collection('inviteCodes').doc(invitationCode)
    const now = new Date()
    const result = await database.runTransaction(async (transaction) => {
      const codeSnapshot = await transaction.get(codeRef)
      if (codeSnapshot.exists) return null
      const tripData = { ...input, organizer: userId, invitationCode, invitationActive: true, createdAt: now, updatedAt: now }
      const membershipRef = database.collection('travelers').doc(membershipId(tripRef.id, userId))
      const membershipSnapshot = await transaction.get(membershipRef)
      if (membershipSnapshot.exists) throw new ApiError(409, 'You are already a member of this trip.')
      transaction.create(tripRef, tripData)
      transaction.create(codeRef, { tripId: tripRef.id })
      transaction.create(membershipRef, { trip: tripRef.id, user: userId, role: 'organizer', preferences: [], joinedAt: now, createdAt: now, updatedAt: now })
      return { ...tripData, _id: tripRef.id }
    })
    if (result) return result
  }
  throw new ApiError(500, 'Could not generate a unique invitation code. Please try again.')
}

async function withOrganizer(trip: TripRecord) {
  const organizer = await userWithId(trip.organizer)
  return { ...trip, organizer: organizer ?? trip.organizer }
}

export async function listTrips(userId: string, search = '') {
  const memberships = await queryRecords<MembershipRecord>(getDb().collection('travelers').where('user', '==', userId))
  if (!memberships.length) return []
  const references = memberships.map((membership) => getDb().collection('trips').doc(membership.trip))
  const snapshots = []
  for (let offset = 0; offset < references.length; offset += 300) {
    snapshots.push(...await getDb().getAll(...references.slice(offset, offset + 300)))
  }
  const needle = search.trim().toLowerCase()
  const trips = snapshots.map((snapshot) => fromSnapshot<TripRecord>(snapshot)).filter((trip): trip is TripRecord => Boolean(trip))
    .filter((trip) => !needle || trip.name.toLowerCase().includes(needle) || trip.destination.toLowerCase().includes(needle))
    .sort((left, right) => new Date(left.startDate).getTime() - new Date(right.startDate).getTime())
  return Promise.all(trips.map(withOrganizer))
}

export async function createTrip(userId: string, input: Record<string, unknown>) {
  return reserveTrip(getDb().collection('trips').doc(), userId, {
    coverImage: '',
    quote: 'Good company makes every place beautiful',
    ...input,
  })
}

export async function joinTripByCode(userId: string, code: string) {
  const database = getDb()
  const normalizedCode = code.trim().toUpperCase()
  const codeRef = database.collection('inviteCodes').doc(normalizedCode)
  const result = await database.runTransaction(async (transaction) => {
    const codeSnapshot = await transaction.get(codeRef)
    if (!codeSnapshot.exists) throw new ApiError(404, 'That invitation code is not valid. Please double-check with your trip organizer.')
    const tripId = codeSnapshot.data()?.tripId as string
    const tripRef = database.collection('trips').doc(tripId)
    const tripSnapshot = await transaction.get(tripRef)
    const trip = fromSnapshot<TripRecord>(tripSnapshot)
    if (!trip) throw new ApiError(404, 'That invitation code is not valid. Please double-check with your trip organizer.')
    if (!trip.invitationActive) throw new ApiError(403, 'This invitation has been revoked by the trip organizer.')
    const membershipQuery = database.collection('travelers').where('trip', '==', tripId).where('user', '==', userId).limit(1)
    const memberSnapshot = await transaction.get(membershipQuery)
    if (!memberSnapshot.empty) throw new ApiError(409, 'You are already a member of this trip.')
    const memberRef = database.collection('travelers').doc(membershipId(tripId, userId))
    const now = new Date()
    transaction.create(memberRef, { trip: tripId, user: userId, role: 'member', preferences: [], joinedAt: now, createdAt: now, updatedAt: now })
    return trip
  })
  return withOrganizer(result)
}

export async function regenerateTripCode(tripId: string) {
  const database = getDb()
  const tripRef = database.collection('trips').doc(tripId)
  for (let attempts = 0; attempts < 10; attempts++) {
    const code = generateInvitationCode()
    const codeRef = database.collection('inviteCodes').doc(code)
    const trip = await database.runTransaction(async (transaction) => {
      const [tripSnapshot, codeSnapshot] = await Promise.all([transaction.get(tripRef), transaction.get(codeRef)])
      const current = fromSnapshot<TripRecord>(tripSnapshot)
      if (!current) throw new ApiError(404, 'Trip not found.')
      if (codeSnapshot.exists) return null
      const oldCodeRef = current.invitationCode ? database.collection('inviteCodes').doc(current.invitationCode) : null
      if (oldCodeRef) transaction.delete(oldCodeRef)
      transaction.create(codeRef, { tripId })
      transaction.update(tripRef, { invitationCode: code, invitationActive: true, updatedAt: new Date() })
      return { ...current, invitationCode: code, invitationActive: true }
    })
    if (trip) return trip
  }
  throw new ApiError(500, 'Could not generate a unique invitation code. Please try again.')
}

export async function revokeTripCode(tripId: string) {
  const reference = getDb().collection('trips').doc(tripId)
  const trip = fromSnapshot<TripRecord>(await reference.get())
  if (!trip) throw new ApiError(404, 'Trip not found.')
  await reference.update({ invitationActive: false, updatedAt: new Date() })
  return { ...trip, invitationActive: false }
}

export async function listTripMembers(tripId: string) {
  const members = await queryRecords<MembershipRecord>(getDb().collection('travelers').where('trip', '==', tripId))
  members.sort((left, right) => new Date(left.joinedAt ?? 0).getTime() - new Date(right.joinedAt ?? 0).getTime())
  return Promise.all(members.map(async (member) => ({ ...member, user: await userWithId(member.user) ?? member.user })))
}

export async function getTripSummary(tripId: string) {
  const database = getDb()
  const trip = fromSnapshot<TripRecord>(await database.collection('trips').doc(tripId).get())
  if (!trip) throw new ApiError(404, 'Trip not found.')
  const [travelers, expenses, activities] = await Promise.all([
    queryRecords<MembershipRecord>(database.collection('travelers').where('trip', '==', tripId)),
    queryRecords<{ _id: string; trip: string; amountInTripCurrency: number }>(database.collection('expenses').where('trip', '==', tripId)),
    queryRecords<{ _id: string; trip: string; day: number; time: string }>(database.collection('activities').where('trip', '==', tripId)),
  ])
  activities.sort((left, right) => left.day - right.day || left.time.localeCompare(right.time))
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amountInTripCurrency, 0)
  const now = new Date()
  const start = new Date(trip.startDate)
  const totalDays = Math.max(1, Math.floor((Date.UTC(trip.endDate.getUTCFullYear(), trip.endDate.getUTCMonth(), trip.endDate.getUTCDate()) - Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) / 86400000) + 1)
  const elapsedDays = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) / 86400000) + 1
  const progress = Math.min(totalDays, Math.max(0, elapsedDays))
  const next = activities.find((activity) => {
    const [hours, minutes] = activity.time.split(':').map(Number)
    const date = new Date(start)
    date.setUTCDate(date.getUTCDate() + activity.day - 1)
    date.setUTCHours(hours ?? 0, minutes ?? 0, 0, 0)
    return date >= now
  }) ?? null
  const organizer = await userWithId(trip.organizer)
  return { trip: { ...trip, organizer: organizer ?? trip.organizer }, travelerCount: travelers.length, totalExpenses, progress, totalDays, nextUpcomingActivity: next }
}

export async function updateTrip(tripId: string, input: Record<string, unknown>) {
  const reference = getDb().collection('trips').doc(tripId)
  const trip = fromSnapshot<TripRecord>(await reference.get())
  if (!trip) throw new ApiError(404, 'Trip not found.')
  const startDate = new Date((input.startDate as Date | undefined) ?? trip.startDate)
  const endDate = new Date((input.endDate as Date | undefined) ?? trip.endDate)
  if (endDate < startDate) throw new ApiError(400, 'End date must be after start date.', { endDate: 'End date must be after start date.' })
  await reference.update({ ...input, updatedAt: new Date() })
  return { ...trip, ...input }
}

export async function deleteTrip(tripId: string) {
  const database = getDb()
  const trip = fromSnapshot<TripRecord>(await database.collection('trips').doc(tripId).get())
  if (!trip) throw new ApiError(404, 'Trip not found.')
  const collections = ['travelers', 'activities', 'expenses', 'settlements', 'photos'] as const
  const snapshots = await Promise.all(collections.map((name) => database.collection(name).where('trip', '==', tripId).get()))
  const photos = snapshots[4]?.docs.map((document) => document.data() as { imageUrl?: string }) ?? []
  await Promise.all([
    ...(trip.coverImage ? [storageProvider.delete(trip.coverImage)] : []),
    ...photos.flatMap((photo) => photo.imageUrl ? [storageProvider.delete(photo.imageUrl)] : []),
  ])
  const batch = database.batch()
  const refs = snapshots.flatMap((snapshot) => snapshot.docs.map((document) => document.ref))
  refs.push(database.collection('trips').doc(tripId))
  if (trip.invitationCode) refs.push(database.collection('inviteCodes').doc(trip.invitationCode))
  for (let offset = 0; offset < refs.length; offset += 400) {
    const portion = refs.slice(offset, offset + 400)
    const part = offset === 0 ? batch : database.batch()
    portion.forEach((reference) => part.delete(reference))
    await part.commit()
  }
}
