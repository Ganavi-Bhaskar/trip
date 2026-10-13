import { Photo } from '../models/Photo'
import { Membership } from '../models/Membership'
import { Trip } from '../models/Trip'
import { storageProvider } from './storage'
import { ApiError } from '../utils/ApiError'

export async function listPhotos(tripId: string) {
  return Photo.find({ trip: tripId }).populate('uploadedBy', 'name avatar').sort({ date: -1, createdAt: -1 }).lean()
}

export async function addPhoto(tripId: string, userId: string, file: Express.Multer.File, metadata: { caption: string; day?: number; activity?: string }) {
  const trip = await Trip.findById(tripId).select('startDate endDate')
  if (!trip) throw new ApiError(404, 'Trip not found.')
  if (metadata.day) {
    const duration = Math.floor((Date.UTC(trip.endDate.getUTCFullYear(), trip.endDate.getUTCMonth(), trip.endDate.getUTCDate()) - Date.UTC(trip.startDate.getUTCFullYear(), trip.startDate.getUTCMonth(), trip.startDate.getUTCDate())) / 86400000) + 1
    if (metadata.day > duration) throw new ApiError(400, 'Photo day must fall within the trip dates.', { day: 'Choose a day within this trip.' })
  }
  const imageUrl = await storageProvider.save(file, 'photos')
  try {
    return await Photo.create({ trip: tripId, uploadedBy: userId, imageUrl, ...metadata, date: new Date() })
  } catch (error) {
    await storageProvider.delete(imageUrl)
    throw error
  }
}

export async function deletePhoto(photoId: string, userId: string) {
  const photo = await Photo.findById(photoId)
  if (!photo) throw new ApiError(404, 'Photo not found.')
  const membership = await Membership.findOne({ trip: photo.trip, user: userId })
  if (!membership) throw new ApiError(403, 'You are not a traveler on this trip.')
  if (membership.role !== 'organizer' && String(photo.uploadedBy) !== userId) throw new ApiError(403, 'You can only delete photos you uploaded.')
  await storageProvider.delete(photo.imageUrl)
  await photo.deleteOne()
}