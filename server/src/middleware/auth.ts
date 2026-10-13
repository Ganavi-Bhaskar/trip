import type { RequestHandler } from 'express'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import { env } from '../config/env'
import { ApiError } from '../utils/ApiError'

export const requireAuth: RequestHandler = (request, _response, next) => {
  const authorization = request.header('authorization')
  if (!authorization?.startsWith('Bearer ')) return next(new ApiError(401, 'Please log in to continue.'))

  try {
    const payload = jwt.verify(authorization.slice(7), env.JWT_SECRET) as JwtPayload
    if (typeof payload.sub !== 'string') throw new Error('Invalid token subject')
    request.authUserId = payload.sub
    next()
  } catch {
    next(new ApiError(401, 'Your session has expired. Please log in again.'))
  }
}