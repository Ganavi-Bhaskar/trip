import type { RequestHandler } from 'express'
import * as activityService from '../services/activityService'

export const list: RequestHandler = async (request, response) => {
  const dayValue = request.query.day ? Number(request.query.day) : undefined
  const activities = await activityService.listActivities(String(request.params.tripId ?? ''), dayValue)
  response.json({ success: true, data: { activities } })
}

export const create: RequestHandler = async (request, response) => {
  const activity = await activityService.createActivity(String(request.params.tripId ?? ''), request.authUserId ?? '', request.body as Record<string, unknown>)
  response.status(201).json({ success: true, data: { activity } })
}

export const update: RequestHandler = async (request, response) => {
  const activity = await activityService.updateActivity(String(request.params.activityId ?? ''), request.authUserId ?? '', request.body as Record<string, unknown>)
  response.json({ success: true, data: { activity } })
}

export const remove: RequestHandler = async (request, response) => {
  await activityService.deleteActivity(String(request.params.activityId ?? ''), request.authUserId ?? '')
  response.json({ success: true, data: { message: 'Activity deleted.' } })
}