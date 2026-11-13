import { getDb, fromQuery, fromSnapshot } from '../config/firebase'
import { queryRecords, userWithId } from '../utils/firestore'
import { storageProvider } from './storage'
import { ApiError } from '../utils/ApiError'

interface TripRecord { _id: string; startDate: Date; endDate: Date }
interface PhotoRecord { _id: string; trip: string; uploadedBy: string; imageUrl: string; date: Date; createdAt: Date }

export async function listPhotos(tripId: string) {
  const photos = await queryRecords<PhotoRecord & Record<string, unknown>>(getDb().collection('photos').where('trip', '==', tripId))
  photos.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime() || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
  return Promise.all(photos.map(async (photo) => ({ ...photo, uploadedBy: await userWithId(photo.uploadedBy) ?? photo.uploadedBy })))
}

export async function addPhoto(tripId: string, userId: string, file: Express.Multer.File, metadata: { caption: string; day?: number; activity?: string }) {
  const trip = fromSnapshot<TripRecord>(await getDb().collection('trips').doc(tripId).get())
  if (!trip) throw new ApiError(404, 'Trip not found.')
  if (metadata.day) {
    const duration = Math.floor((Date.UTC(trip.endDate.getUTCFullYear(), trip.endDate.getUTCMonth(), trip.endDate.getUTCDate()) - Date.UTC(trip.startDate.getUTCFullYear(), trip.startDate.getUTCMonth(), trip.startDate.getUTCDate())) / 86400000) + 1
    if (metadata.day > duration) throw new ApiError(400, 'Photo day must fall within the trip dates.', { day: 'Choose a day within this trip.' })
  }
  if (metadata.activity) {
    const activity = fromSnapshot<{ _id: string; trip: string }>(await getDb().collection('activities').doc(metadata.activity).get())
    if (!activity || activity.trip !== tripId) throw new ApiError(400, 'The selected activity is not in this trip.')
  }
  const imageUrl = await storageProvider.save(file, 'photos')
  try {
    const reference = getDb().collection('photos').doc()
    const now = new Date()
    const photo = { trip: tripId, uploadedBy: userId, imageUrl, ...metadata, date: now, createdAt: now, updatedAt: now }
    await reference.create(photo)
    return { ...photo, _id: reference.id }
  } catch (error) {
    await storageProvider.delete(imageUrl)
    throw error
  }
}

export async function deletePhoto(photoId: string, userId: string) {
  const database = getDb()
  const photo = fromSnapshot<PhotoRecord>(await database.collection('photos').doc(photoId).get())
  if (!photo) throw new ApiError(404, 'Photo not found.')
  const membershipQuery = await database.collection('travelers').where('trip', '==', photo.trip).where('user', '==', userId).limit(1).get()
  const membership = membershipQuery.docs[0]?.data() as { role: 'organizer' | 'member' } | undefined
  if (!membership) throw new ApiError(403, 'You are not a traveler on this trip.')
  if (membership.role !== 'organizer' && photo.uploadedBy !== userId) throw new ApiError(403, 'You can only delete photos you uploaded.')
  await storageProvider.delete(photo.imageUrl)
  await database.collection('photos').doc(photoId).delete()
}
