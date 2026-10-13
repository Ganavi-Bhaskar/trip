import type { RequestHandler } from 'express'
import { getTripBalance } from '../services/balanceQueryService'
import { getSettlements, settle } from '../services/settlementService'

export const balance: RequestHandler = async (request, response) => {
  const data = await getTripBalance(String(request.params.tripId ?? ''))
  response.json({ success: true, data })
}

export const settlements: RequestHandler = async (request, response) => {
  const data = await getSettlements(String(request.params.tripId ?? ''))
  response.json({ success: true, data: { settlements: data } })
}

export const markSettled: RequestHandler = async (request, response) => {
  await settle(String(request.params.settlementId ?? ''), request.authUserId ?? '')
  response.json({ success: true, data: { message: 'Settlement marked as complete.' } })
}