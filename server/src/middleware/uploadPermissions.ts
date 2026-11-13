import type { RequestHandler } from 'express'
import { membershipFor } from '../utils/firestore'
import { ApiError } from '../utils/ApiError'

export const requireTripOrganizerForCover: RequestHandler = (request, _response, next) => {
  const tripId = request.body.tripId
  if (typeof tripId !== 'string' || !tripId || tripId.length > 128 || tripId.includes('/')) return next(new ApiError(400, 'A valid tripId is required for a cover upload.'))
  if (!request.authUserId) return next(new ApiError(401, 'Please log in to continue.'))
  void membershipFor(tripId, request.authUserId).then((membership) => {
    if (membership?.role !== 'organizer') return next(new ApiError(403, 'Only a trip organizer can upload a cover.'))
    next()
  }).catch(next)
}