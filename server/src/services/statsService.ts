import { getDb, fromSnapshot } from '../config/firebase'
import { queryRecords } from '../utils/firestore'
import { ApiError } from '../utils/ApiError'

export async function getTripStats(tripId: string) {
  const database = getDb()
  const tripSnapshot = await database.collection('trips').doc(tripId).get()
  const trip = fromSnapshot<{ startDate: Date; endDate: Date }>(tripSnapshot)
  if (!trip) throw new ApiError(404, 'Trip not found.')
  const [expenses, activities, travelers] = await Promise.all([
    queryRecords<{ _id: string; trip: string; amountInTripCurrency: number; category: string }>(database.collection('expenses').where('trip', '==', tripId)),
    queryRecords<{ _id: string; trip: string; day: number; time: string }>(database.collection('activities').where('trip', '==', tripId)),
    queryRecords<{ _id: string; trip: string }>(database.collection('travelers').where('trip', '==', tripId)),
  ])
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amountInTripCurrency, 0)
  const byCategory = new Map<string, number>()
  for (const expense of expenses) byCategory.set(expense.category, (byCategory.get(expense.category) ?? 0) + expense.amountInTripCurrency)
  const today = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())
  const start = Date.UTC(new Date(trip.startDate).getUTCFullYear(), new Date(trip.startDate).getUTCMonth(), new Date(trip.startDate).getUTCDate())
  const endDate = new Date(trip.endDate)
  const end = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate())
  const totalDays = Math.floor((end - start) / 86400000) + 1
  const daysCompleted = Math.max(0, Math.min(totalDays, Math.floor((today - start) / 86400000)))
  const upcomingActivities = activities.filter((activity) => {
    const activityDate = new Date(start)
    activityDate.setUTCDate(activityDate.getUTCDate() + activity.day - 1)
    const [hours, minutes] = activity.time.split(':').map(Number)
    activityDate.setUTCHours(hours ?? 0, minutes ?? 0, 0, 0)
    return activityDate.getTime() >= Date.now()
  }).sort((left, right) => left.day - right.day || left.time.localeCompare(right.time)).slice(0, 5)
  return {
    totalExpenses,
    activityCount: activities.length,
    travelerCount: travelers.length,
    daysCompleted,
    totalDays,
    upcomingActivities,
    spendingByCategory: [...byCategory].map(([category, total]) => ({ category, total })),
  }
}
