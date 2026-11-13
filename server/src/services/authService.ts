import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getDb, emailDocumentId } from '../config/firebase'
import { env } from '../config/env'
import { userByEmail } from '../utils/firestore'
import { ApiError } from '../utils/ApiError'

function publicUser(user: { _id: string; name: string; email: string; avatar?: string; isGuest?: boolean; preferences?: unknown }) {
  return { id: user._id, name: user.name, email: user.email, avatar: user.avatar ?? '', isGuest: user.isGuest ?? false, preferences: user.preferences ?? {} }
}

function issueToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, { subject: userId, expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] })
}

export async function register(input: { name: string; email: string; password: string }) {
  const email = input.email.trim().toLowerCase()
  const password = await bcrypt.hash(input.password, 12)
  const database = getDb()
  const emailRef = database.collection('userEmails').doc(emailDocumentId(email))
  const userRef = database.collection('users').doc()
  const user = await database.runTransaction(async (transaction) => {
    const emailSnapshot = await transaction.get(emailRef)
    if (emailSnapshot.exists) {
      const userId = emailSnapshot.data()?.userId as string
      const existingRef = database.collection('users').doc(userId)
      const existingSnapshot = await transaction.get(existingRef)
      const existing = existingSnapshot.data()
      if (!existing) throw new Error('Email index points to a missing user record.')
      if (!existing.isGuest) throw new ApiError(409, 'That email is already registered.')
      const updated = { ...existing, email: existing.email as string, name: input.name, password, isGuest: false, updatedAt: new Date() }
      transaction.set(existingRef, updated)
      return { ...updated, _id: userId }
    }

    const timestamp = new Date()
    const created = {
      name: input.name, email, password, avatar: '', isGuest: false,
      preferences: { currency: 'INR', notifications: true, theme: 'system' },
      createdAt: timestamp, updatedAt: timestamp,
    }
    transaction.create(userRef, created)
    transaction.create(emailRef, { userId: userRef.id })
    return { ...created, _id: userRef.id }
  })
  return { user: publicUser(user), token: issueToken(user._id) }
}

export async function login(input: { email: string; password: string }) {
  const user = await userByEmail<{ _id: string; name: string; email: string; password?: string; avatar?: string; isGuest?: boolean; preferences?: unknown }>(input.email.trim().toLowerCase())
  if (!user?.password || typeof user.password !== 'string' || !(await bcrypt.compare(input.password, user.password))) {
    throw new ApiError(401, 'Email or password is incorrect.')
  }
  return { user: publicUser(user), token: issueToken(user._id) }
}

export async function getSession(userId: string) {
  const user = await getDb().collection('users').doc(userId).get()
  const data = user.data()
  if (!data) throw new ApiError(401, 'Your account could not be found. Please log in again.')
  return publicUser({ ...data, _id: user.id } as { _id: string; name: string; email: string; avatar?: string; isGuest?: boolean; preferences?: unknown })
}
