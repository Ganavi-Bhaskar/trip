import type { RequestHandler } from 'express'
import * as tripService from '../services/tripService'

export const list: RequestHandler = async (request, response) => {
  const trips = await tripService.listTrips(request.authUserId ?? '', String(request.query.search ?? ''))
  response.json({ success: true, data: { trips } })
}

export const create: RequestHandler = async (request, response) => {
  const trip = await tripService.createTrip(request.authUserId ?? '', request.body as Record<string, unknown>)
  response.status(201).json({ success: true, data: { trip } })
}

export const get: RequestHandler = async (request, response) => {
  const summary = await tripService.getTripSummary(String(request.params.tripId ?? ''))
  response.json({ success: true, data: summary })
}

export const update: RequestHandler = async (request, response) => {
  const trip = await tripService.updateTrip(String(request.params.tripId ?? ''), request.body as Record<string, unknown>)
  response.json({ success: true, data: { trip } })
}

export const remove: RequestHandler = async (request, response) => {
  await tripService.deleteTrip(String(request.params.tripId ?? ''))
  response.json({ success: true, data: { message: 'Trip deleted.' } })
}

export const joinTrip: RequestHandler = async (request, response) => {
  const body = request.body as { code?: string }
  const trip = await tripService.joinTripByCode(request.authUserId ?? '', body.code ?? '')
  response.json({ success: true, data: { trip } })
}

export const listMembers: RequestHandler = async (request, response) => {
  const members = await tripService.listTripMembers(String(request.params.tripId ?? ''))
  response.json({ success: true, data: { members } })
}

export const regenerateCode: RequestHandler = async (request, response) => {
  const trip = await tripService.regenerateTripCode(String(request.params.tripId ?? ''))
  response.json({ success: true, data: { trip } })
}

export const revokeCode: RequestHandler = async (request, response) => {
  const trip = await tripService.revokeTripCode(String(request.params.tripId ?? ''))
  response.json({ success: true, data: { trip } })
}