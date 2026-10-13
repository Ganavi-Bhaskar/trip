import { Expense } from '../models/Expense'
import { Membership } from '../models/Membership'
import { User } from '../models/User'
import { ApiError } from '../utils/ApiError'

export async function listTravelers(tripId: string) {
  return Membership.find({ trip: tripId }).populate('user', 'name email avatar isGuest').sort({ joinedAt: 1 }).lean()
}

export async function addTraveler(tripId: string, input: { email: string; name?: string; role: 'organizer' | 'member'; preferences: string[] }) {
  const email = input.email.toLowerCase()
  const user = await User.findOne({ email }) ?? await User.create({
    email,
    name: input.name ?? email.split('@')[0] ?? 'Traveler',
    isGuest: true,
  })
  const existing = await Membership.findOne({ trip: tripId, user: user._id })
  if (existing) throw new ApiError(409, 'This traveler is already on the trip.')
  const membership = await Membership.create({ trip: tripId, user: user._id, role: input.role, preferences: input.preferences })
  await membership.populate('user', 'name email avatar isGuest')
  return membership
}

export async function updateTraveler(tripId: string, userId: string, input: { role?: 'organizer' | 'member'; preferences?: string[] }) {
  const membership = await Membership.findOne({ trip: tripId, user: userId })
  if (!membership) throw new ApiError(404, 'Traveler not found.')
  if (input.role === 'member' && membership.role === 'organizer') {
    const organizerCount = await Membership.countDocuments({ trip: tripId, role: 'organizer' })
    if (organizerCount <= 1) throw new ApiError(409, 'A trip must always have at least one organizer.')
  }
  if (input.role) membership.role = input.role
  if (input.preferences) membership.preferences = input.preferences
  await membership.save()
  await membership.populate('user', 'name email avatar isGuest')
  return membership
}

export async function removeTraveler(tripId: string, userId: string) {
  const membership = await Membership.findOne({ trip: tripId, user: userId })
  if (!membership) throw new ApiError(404, 'Traveler not found.')
  if (membership.role === 'organizer') {
    const organizerCount = await Membership.countDocuments({ trip: tripId, role: 'organizer' })
    if (organizerCount <= 1) throw new ApiError(409, 'A trip must always have at least one organizer.')
  }
  const referenced = await Expense.exists({
    trip: tripId,
    $or: [{ paidBy: userId }, { participants: userId }, { 'computedShares.user': userId }],
  })
  if (referenced) throw new ApiError(409, 'This traveler is referenced by trip expenses. Update or delete those expenses first.')
  await membership.deleteOne()
}