import type { RequestHandler } from 'express'
import { Membership } from '../models/Membership'
import { ApiError } from '../utils/ApiError'

export const requireTripOrganizerForCover: RequestHandler = (request, _response, next) => {
  const tripId = request.body.tripId
  if (typeof tripId !== 'string' || !/^[a-f\d]{24}$/i.test(tripId)) return next(new ApiError(400, 'A valid tripId is required for a cover upload.'))
  if (!request.authUserId) return next(new ApiError(401, 'Please log in to continue.'))
  void Membership.exists({ trip: tripId, user: request.authUserId, role: 'organizer' }).then((membership) => {
    if (!membership) return next(new ApiError(403, 'Only a trip organizer can upload a cover.'))
    next()
  }).catch(next)
}