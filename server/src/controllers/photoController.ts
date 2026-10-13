import type { RequestHandler } from 'express'
import * as photoService from '../services/photoService'

export const list: RequestHandler = async (request, response) => {
  const photos = await photoService.listPhotos(String(request.params.tripId ?? ''))
  response.json({ success: true, data: { photos } })
}

export const create: RequestHandler = async (request, response) => {
  const photo = await photoService.addPhoto(String(request.params.tripId ?? ''), request.authUserId ?? '', request.file as Express.Multer.File, request.body as {
    caption: string; day?: number; activity?: string
  })
  response.status(201).json({ success: true, data: { photo } })
}

export const remove: RequestHandler = async (request, response) => {
  await photoService.deletePhoto(String(request.params.photoId ?? ''), request.authUserId ?? '')
  response.json({ success: true, data: { message: 'Photo deleted.' } })
}