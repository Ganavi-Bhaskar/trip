import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../config/env'
import { User } from '../models/User'
import { ApiError } from '../utils/ApiError'

function publicUser(user: { _id: unknown; name: string; email: string; avatar?: string; isGuest?: boolean; preferences?: unknown }) {
  return { id: String(user._id), name: user.name, email: user.email, avatar: user.avatar ?? '', isGuest: user.isGuest ?? false, preferences: user.preferences ?? {} }
}

function issueToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, { subject: userId, expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] })
}

export async function register(input: { name: string; email: string; password: string }) {
  const email = input.email.trim().toLowerCase()
  const existing = await User.findOne({ email }).select('+password')
  const password = await bcrypt.hash(input.password, 12)

  if (existing && !existing.isGuest) throw new ApiError(409, 'That email is already registered.')
  const user = existing
    ? await User.findByIdAndUpdate(existing._id, { name: input.name, password, isGuest: false }, { new: true })
    : await User.create({ name: input.name, email, password })
  if (!user) throw new ApiError(500, 'Could not create your account.')
  return { user: publicUser(user), token: issueToken(String(user._id)) }
}

export async function login(input: { email: string; password: string }) {
  const user = await User.findOne({ email: input.email.trim().toLowerCase() }).select('+password')
  if (!user?.password || !(await bcrypt.compare(input.password, user.password))) {
    throw new ApiError(401, 'Email or password is incorrect.')
  }
  return { user: publicUser(user), token: issueToken(String(user._id)) }
}

export async function getSession(userId: string) {
  const user = await User.findById(userId)
  if (!user) throw new ApiError(401, 'Your account could not be found. Please log in again.')
  return publicUser(user)
}