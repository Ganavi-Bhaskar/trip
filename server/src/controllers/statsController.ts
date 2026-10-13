import type { RequestHandler } from 'express'
import { getTripStats } from '../services/statsService'

export const stats: RequestHandler = async (request, response) => {
  const data = await getTripStats(String(request.params.tripId ?? ''))
  response.json({ success: true, data })
}