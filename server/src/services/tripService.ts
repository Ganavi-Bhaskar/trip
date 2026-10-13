import { Activity } from '../models/Activity'
import { Expense } from '../models/Expense'
import { Membership } from '../models/Membership'
import { Photo } from '../models/Photo'
import { Settlement } from '../models/Settlement'
import { Trip } from '../models/Trip'
import { storageProvider } from './storage'
import { ApiError } from '../utils/ApiError'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateInvitationCode(): string {
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

async function createUniqueCode(): Promise<string> {
  for (let attempts = 0; attempts < 10; attempts++) {
    const code = generateInvitationCode()
    const existing = await Trip.exists({ invitationCode: code })
    if (!existing) return code
  }
  throw new ApiError(500, 'Could not generate a unique invitation code. Please try again.')
}

export async function listTrips(userId: string, search = '') {
  const memberships = await Membership.find({ user: userId }).select('trip')
  const tripIds = memberships.map((membership) => membership.trip)
  const filter: Record<string, unknown> = { _id: { $in: tripIds } }
  if (search.trim()) filter.$or = [
    { name: { $regex: escapeRegex(search.trim()), $options: 'i' } },
    { destination: { $regex: escapeRegex(search.trim()), $options: 'i' } },
  ]
  return Trip.find(filter).populate('organizer', 'name avatar').sort({ startDate: 1 }).lean()
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function createTrip(userId: string, input: Record<string, unknown>) {
  const invitationCode = await createUniqueCode()
  const trip = await Trip.create({ ...input, organizer: userId, invitationCode, invitationActive: true })
  await Membership.create({ user: userId, trip: trip._id, role: 'organizer' })
  return trip
}

export async function joinTripByCode(userId: string, code: string) {
  const normalizedCode = code.trim().toUpperCase()
  const trip = await Trip.findOne({ invitationCode: normalizedCode }).populate('organizer', 'name avatar')
  if (!trip) throw new ApiError(404, 'That invitation code is not valid. Please double-check with your trip organizer.')
  if (!trip.invitationActive) throw new ApiError(403, 'This invitation has been revoked by the trip organizer.')

  const existing = await Membership.findOne({ trip: trip._id, user: userId })
  if (existing) throw new ApiError(409, 'You are already a member of this trip.')

  await Membership.create({ user: userId, trip: trip._id, role: 'member' })
  return trip
}

export async function regenerateTripCode(tripId: string) {
  const trip = await Trip.findById(tripId)
  if (!trip) throw new ApiError(404, 'Trip not found.')
  const invitationCode = await createUniqueCode()
  trip.invitationCode = invitationCode
  trip.invitationActive = true
  await trip.save()
  return trip
}

export async function revokeTripCode(tripId: string) {
  const trip = await Trip.findById(tripId)
  if (!trip) throw new ApiError(404, 'Trip not found.')
  trip.invitationActive = false
  await trip.save()
  return trip
}

export async function listTripMembers(tripId: string) {
  return Membership.find({ trip: tripId })
    .populate('user', 'name email avatar')
    .sort({ joinedAt: 1 })
    .lean()
}

export async function getTripSummary(tripId: string) {
  const trip = await Trip.findById(tripId).populate('organizer', 'name avatar')
  if (!trip) throw new ApiError(404, 'Trip not found.')
  const [travelerCount, expenses, activities] = await Promise.all([
    Membership.countDocuments({ trip: tripId }),
    Expense.find({ trip: tripId }).select('amountInTripCurrency'),
    Activity.find({ trip: tripId }).sort({ day: 1, time: 1 }),
  ])
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amountInTripCurrency, 0)
  const now = new Date()
  const start = new Date(trip.startDate)
  const totalDays = Math.max(1, Math.floor((Date.UTC(trip.endDate.getUTCFullYear(), trip.endDate.getUTCMonth(), trip.endDate.getUTCDate()) - Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) / 86400000) + 1)
  const elapsedDays = Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) / 86400000) + 1
  const progress = Math.min(totalDays, Math.max(0, elapsedDays))
  const nextUpcomingActivity = activities.find((activity) => {
    const [hours, minutes] = activity.time.split(':').map(Number)
    const date = new Date(start)
    date.setUTCDate(date.getUTCDate() + activity.day - 1)
    date.setUTCHours(hours ?? 0, minutes ?? 0, 0, 0)
    return date >= now
  }) ?? null
  return { trip, travelerCount, totalExpenses, progress, totalDays, nextUpcomingActivity }
}

export async function updateTrip(tripId: string, input: Record<string, unknown>) {
  const trip = await Trip.findById(tripId)
  if (!trip) throw new ApiError(404, 'Trip not found.')
  Object.assign(trip, input)
  await trip.save()
  return trip
}

export async function deleteTrip(tripId: string) {
  const trip = await Trip.findById(tripId)
  if (!trip) throw new ApiError(404, 'Trip not found.')
  const photos = await Photo.find({ trip: tripId }).select('imageUrl').lean()
  await Promise.all([
    ...(trip.coverImage ? [storageProvider.delete(trip.coverImage)] : []),
    ...photos.map((photo) => storageProvider.delete(photo.imageUrl)),
  ])
  await Promise.all([
    Membership.deleteMany({ trip: tripId }),
    Activity.deleteMany({ trip: tripId }),
    Expense.deleteMany({ trip: tripId }),
    Settlement.deleteMany({ trip: tripId }),
    Photo.deleteMany({ trip: tripId }),
  ])
  await trip.deleteOne()
}