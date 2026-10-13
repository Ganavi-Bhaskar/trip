import type { RequestHandler } from 'express'
import { Membership } from '../models/Membership'
import { ApiError } from '../utils/ApiError'
import { z } from 'zod'

export const tripAccess: RequestHandler = (request, _response, next) => {
  const tripId = request.params.tripId ?? request.params.id
  if (!tripId || !request.authUserId) return next(new ApiError(400, 'A trip is required.'))
  if (!z.string().regex(/^[a-f\d]{24}$/i).safeParse(tripId).success) return next(new ApiError(400, 'The requested trip is invalid.', { tripId: 'Invalid trip identifier.' }))
  void Membership.findOne({ trip: tripId, user: request.authUserId }).then((membership) => {
    if (!membership) return next(new ApiError(403, 'You are not a traveler on this trip.'))
    request.tripRole = membership.role
    next()
  }).catch(next)
}

export const requireOrganizer: RequestHandler = (request, _response, next) => {
  if (request.tripRole !== 'organizer') return next(new ApiError(403, 'Only a trip organizer can do that.'))
  next()
}