import { getDb, fromSnapshot } from '../config/firebase'
import { membershipFor, queryRecords, userWithId } from '../utils/firestore'
import { ApiError } from '../utils/ApiError'

type TripRecord = { _id: string; startDate: Date; endDate: Date }
type ActivityRecord = { _id: string; trip: string; day: number; time: string; createdBy: string }
function tripDayCount(startDate: Date, endDate: Date): number {
  const start = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())
  const end = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
  return Math.floor((end - start) / 86400000) + 1
}

async function assertDay(tripId: string, day: number): Promise<void> {
  const trip = fromSnapshot<TripRecord>(await getDb().collection('trips').doc(tripId).get())
  if (!trip) throw new ApiError(404, 'Trip not found.')
  if (day > tripDayCount(new Date(trip.startDate), new Date(trip.endDate))) throw new ApiError(400, 'Activity day must fall within the trip dates.', { day: 'Choose a day within this trip.' })
}

export async function listActivities(tripId: string, day?: number) {
  const query = getDb().collection('activities').where('trip', '==', tripId)
  const activities = await queryRecords<ActivityRecord & Record<string, unknown>>(day ? query.where('day', '==', day) : query)
  activities.sort((left, right) => left.day - right.day || left.time.localeCompare(right.time))
  return Promise.all(activities.map(async (activity) => ({ ...activity, createdBy: await userWithId(activity.createdBy) ?? activity.createdBy })))
}

export async function createActivity(tripId: string, userId: string, input: Record<string, unknown>) {
  await assertDay(tripId, input.day as number)
  return createActivityRecord({ ...input, trip: tripId, createdBy: userId })
}

async function createActivityRecord(input: Record<string, unknown>) {
  const reference = getDb().collection('activities').doc()
  const now = new Date()
  const activity = { ...input, createdAt: now, updatedAt: now }
  await reference.create(activity)
  return { ...activity, _id: reference.id }
}

async function authorizeMutation(activityId: string, userId: string) {
  const activity = fromSnapshot<ActivityRecord & Record<string, unknown>>(await getDb().collection('activities').doc(activityId).get())
  if (!activity) throw new ApiError(404, 'Activity not found.')
  const membership = await membershipFor(activity.trip, userId)
  if (!membership) throw new ApiError(403, 'You are not a traveler on this trip.')
  if (membership.role !== 'organizer' && activity.createdBy !== userId) throw new ApiError(403, 'You can only change activities you added.')
  return activity
}

export async function updateActivity(activityId: string, userId: string, input: Record<string, unknown>) {
  const activity = await authorizeMutation(activityId, userId)
  const day = (input.day as number | undefined) ?? activity.day
  await assertDay(activity.trip, day)
  await getDb().collection('activities').doc(activityId).update({ ...input, updatedAt: new Date() })
  return { ...activity, ...input }
}

export async function deleteActivity(activityId: string, userId: string) {
  await authorizeMutation(activityId, userId)
  await getDb().collection('activities').doc(activityId).delete()
}
