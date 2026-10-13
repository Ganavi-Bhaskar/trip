import { Activity } from '../models/Activity'
import { Expense } from '../models/Expense'
import { Membership } from '../models/Membership'
import { Trip } from '../models/Trip'
import { ApiError } from '../utils/ApiError'

export async function getTripStats(tripId: string) {
  const trip = await Trip.findById(tripId).select('startDate endDate')
  if (!trip) throw new ApiError(404, 'Trip not found.')
  const [expenses, activityCount, travelerCount, activities] = await Promise.all([
    Expense.find({ trip: tripId }).select('amountInTripCurrency category'),
    Activity.countDocuments({ trip: tripId }),
    Membership.countDocuments({ trip: tripId }),
    Activity.find({ trip: tripId }).sort({ day: 1, time: 1 }),
  ])
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amountInTripCurrency, 0)
  const byCategory = new Map<string, number>()
  for (const expense of expenses) byCategory.set(expense.category, (byCategory.get(expense.category) ?? 0) + expense.amountInTripCurrency)
  const today = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())
  const start = Date.UTC(trip.startDate.getUTCFullYear(), trip.startDate.getUTCMonth(), trip.startDate.getUTCDate())
  const end = Date.UTC(trip.endDate.getUTCFullYear(), trip.endDate.getUTCMonth(), trip.endDate.getUTCDate())
  const totalDays = Math.floor((end - start) / 86400000) + 1
  const daysCompleted = Math.max(0, Math.min(totalDays, Math.floor((today - start) / 86400000)))
  const upcomingActivities = activities.filter((activity) => {
    const activityDate = new Date(start)
    activityDate.setUTCDate(activityDate.getUTCDate() + activity.day - 1)
    const [hours, minutes] = activity.time.split(':').map(Number)
    activityDate.setUTCHours(hours ?? 0, minutes ?? 0, 0, 0)
    return activityDate.getTime() >= Date.now()
  }).slice(0, 5)
  return {
    totalExpenses,
    activityCount,
    travelerCount,
    daysCompleted,
    totalDays,
    upcomingActivities,
    spendingByCategory: [...byCategory].map(([category, total]) => ({ category, total })),
  }
}