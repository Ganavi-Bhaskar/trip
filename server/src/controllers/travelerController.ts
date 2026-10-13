import type { RequestHandler } from 'express'
import * as travelerService from '../services/travelerService'

export const list: RequestHandler = async (request, response) => {
  const travelers = await travelerService.listTravelers(String(request.params.tripId ?? ''))
  response.json({ success: true, data: { travelers } })
}

export const add: RequestHandler = async (request, response) => {
  const traveler = await travelerService.addTraveler(String(request.params.tripId ?? ''), request.body as {
    email: string; name?: string; role: 'organizer' | 'member'; preferences: string[]
  })
  response.status(201).json({ success: true, data: { traveler } })
}

export const update: RequestHandler = async (request, response) => {
  const traveler = await travelerService.updateTraveler(String(request.params.tripId ?? ''), String(request.params.userId ?? ''), request.body as {
    role?: 'organizer' | 'member'; preferences?: string[]
  })
  response.json({ success: true, data: { traveler } })
}

export const remove: RequestHandler = async (request, response) => {
  await travelerService.removeTraveler(String(request.params.tripId ?? ''), String(request.params.userId ?? ''))
  response.json({ success: true, data: { message: 'Traveler removed.' } })
}