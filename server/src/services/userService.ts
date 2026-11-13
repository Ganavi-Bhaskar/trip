import bcrypt from 'bcryptjs'
import { getDb, emailDocumentId } from '../config/firebase'
import { getRecord, saveRecord, queryRecords } from '../utils/firestore'
import { ApiError } from '../utils/ApiError'
import { deleteTrip } from './tripService'

interface UserRecord {
  _id: string
  name: string
  email: string
  password?: string
  avatar: string
  isGuest: boolean
  preferences: { currency: string; notifications: boolean; theme: 'light' | 'dark' | 'system' }
}
interface MembershipRecord { _id: string; trip: string; user: string; role: 'organizer' | 'member' }

export async function updateProfile(userId: string, input: { name?: string; avatar?: string; preferences?: { currency?: string; notifications?: boolean; theme?: 'light' | 'dark' | 'system' } }) {
  const user = await getRecord<UserRecord>('users', userId)
  if (!user) throw new ApiError(404, 'Account not found.')
  const preferences = { ...user.preferences, ...input.preferences }
  await saveRecord('users', userId, { ...(input.name !== undefined ? { name: input.name } : {}), ...(input.avatar !== undefined ? { avatar: input.avatar } : {}), preferences })
  return { id: userId, name: input.name ?? user.name, email: user.email, avatar: input.avatar ?? user.avatar, isGuest: user.isGuest, preferences }
}

export async function changePassword(userId: string, input: { currentPassword: string; newPassword: string }): Promise<void> {
  const user = await getRecord<UserRecord>('users', userId)
  if (!user?.password || !(await bcrypt.compare(input.currentPassword, user.password))) throw new ApiError(401, 'Current password is incorrect.')
  await saveRecord('users', userId, { password: await bcrypt.hash(input.newPassword, 12), isGuest: false })
}

export async function deleteAccount(userId: string, password: string): Promise<void> {
  const database = getDb()
  const user = await getRecord<UserRecord>('users', userId)
  if (!user?.password || !(await bcrypt.compare(password, user.password))) throw new ApiError(401, 'Password is incorrect.')
  const memberships = await queryRecords<MembershipRecord>(database.collection('travelers').where('user', '==', userId))
  const organizerMemberships = memberships.filter((membership) => membership.role === 'organizer')

  for (const membership of organizerMemberships) {
    const others = memberships.filter((entry) => entry.trip === membership.trip && entry.user !== userId)
    const otherOrganizers = others.filter((entry) => entry.role === 'organizer')
    if (others.length > 0 && otherOrganizers.length === 0) throw new ApiError(409, 'Transfer organizer access before deleting your account.')
    if (others.length === 0) await deleteTrip(membership.trip)
    else {
      const tripRef = database.collection('trips').doc(membership.trip)
      await tripRef.update({ organizer: otherOrganizers[0]?.user, updatedAt: new Date() })
    }
  }

  const refs = memberships.map((membership) => database.collection('travelers').doc(membership._id))
  refs.push(database.collection('userEmails').doc(emailDocumentId(user.email)), database.collection('users').doc(userId))
  for (let offset = 0; offset < refs.length; offset += 400) {
    const batch = database.batch()
    refs.slice(offset, offset + 400).forEach((reference) => batch.delete(reference))
    await batch.commit()
  }
}
