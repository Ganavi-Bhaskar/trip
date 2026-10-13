import type { RequestHandler } from 'express'
import { storageProvider } from '../services/storage'
import { ApiError } from '../utils/ApiError'

function upload(bucket: 'avatars' | 'covers' | 'photos'): RequestHandler {
  return async (request, response, next) => {
    if (!request.file) return next(new ApiError(400, 'Choose an image to upload.'))
    try {
      const url = await storageProvider.save(request.file, bucket)
      response.status(201).json({ success: true, data: { url } })
    } catch (error) {
      next(error)
    }
  }
}

export const avatar = upload('avatars')
export const tripCover = upload('covers')
export const photo = upload('photos')