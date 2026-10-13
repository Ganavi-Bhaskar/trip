import { Activity } from '../models/Activity'
import { Membership } from '../models/Membership'
import { Trip } from '../models/Trip'
import { ApiError } from '../utils/ApiError'

function tripDayCount(startDate: Date, endDate: Date): number {
  const start = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())
  const end = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
  return Math.floor((end - start) / 86400000) + 1
}

async function assertDay(tripId: string, day: number): Promise<void> {
  const trip = await Trip.findById(tripId).select('startDate endDate')
  if (!trip) throw new ApiError(404, 'Trip not found.')
  if (day > tripDayCount(trip.startDate, trip.endDate)) throw new ApiError(400, 'Activity day must fall within the trip dates.', { day: 'Choose a day within this trip.' })
}

export async function listActivities(tripId: string, day?: number) {
  return Activity.find({ trip: tripId, ...(day ? { day } : {}) }).populate('createdBy', 'name avatar').sort({ day: 1, time: 1 }).lean()
}

export async function createActivity(tripId: string, userId: string, input: Record<string, unknown>) {
  await assertDay(tripId, input.day as number)
  return Activity.create({ ...input, trip: tripId, createdBy: userId })
}

async function authorizeMutation(activityId: string, userId: string) {
  const activity = await Activity.findById(activityId)
  if (!activity) throw new ApiError(404, 'Activity not found.')
  const membership = await Membership.findOne({ trip: activity.trip, user: userId })
  if (!membership) throw new ApiError(403, 'You are not a traveler on this trip.')
  if (membership.role !== 'organizer' && String(activity.createdBy) !== userId) throw new ApiError(403, 'You can only change activities you added.')
  return activity
}

export async function updateActivity(activityId: string, userId: string, input: Record<string, unknown>) {
  const activity = await authorizeMutation(activityId, userId)
  const day = (input.day as number | undefined) ?? activity.day
  await assertDay(String(activity.trip), day)
  Object.assign(activity, input)
  await activity.save()
  return activity
}

export async function deleteActivity(activityId: string, userId: string) {
  const activity = await authorizeMutation(activityId, userId)
  await activity.deleteOne()
}