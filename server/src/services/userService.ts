import bcrypt from 'bcryptjs'
import { User } from '../models/User'
import { Membership } from '../models/Membership'
import { Trip } from '../models/Trip'
import { ApiError } from '../utils/ApiError'
import { deleteTrip } from './tripService'

export async function updateProfile(userId: string, input: { name?: string; avatar?: string; preferences?: { currency?: string; notifications?: boolean; theme?: 'light' | 'dark' | 'system' } }) {
  const user = await User.findById(userId)
  if (!user) throw new ApiError(404, 'Account not found.')
  if (input.name !== undefined) user.name = input.name
  if (input.avatar !== undefined) user.avatar = input.avatar
  if (input.preferences) user.set('preferences', { ...user.preferences, ...input.preferences })
  await user.save()
  return { id: String(user._id), name: user.name, email: user.email, avatar: user.avatar, isGuest: user.isGuest, preferences: user.preferences }
}

export async function changePassword(userId: string, input: { currentPassword: string; newPassword: string }): Promise<void> {
  const user = await User.findById(userId).select('+password')
  if (!user?.password || !(await bcrypt.compare(input.currentPassword, user.password))) throw new ApiError(401, 'Current password is incorrect.')
  user.password = await bcrypt.hash(input.newPassword, 12)
  user.isGuest = false
  await user.save()
}

export async function deleteAccount(userId: string, password: string): Promise<void> {
  const user = await User.findById(userId).select('+password')
  if (!user?.password || !(await bcrypt.compare(password, user.password))) throw new ApiError(401, 'Password is incorrect.')
  const organizerMemberships = await Membership.find({ user: userId, role: 'organizer' })
  for (const membership of organizerMemberships) {
    const others = await Membership.countDocuments({ trip: membership.trip, user: { $ne: userId } })
    const otherOrganizers = await Membership.countDocuments({ trip: membership.trip, role: 'organizer', user: { $ne: userId } })
    if (others > 0 && otherOrganizers === 0) throw new ApiError(409, 'Transfer organizer access before deleting your account.')
    if (others === 0) await deleteTrip(String(membership.trip))
    else await Trip.updateOne({ _id: membership.trip, organizer: userId }, { $set: { organizer: (await Membership.findOne({ trip: membership.trip, role: 'organizer', user: { $ne: userId } }))?.user } })
  }
  await Membership.deleteMany({ user: userId })
  await user.deleteOne()
}