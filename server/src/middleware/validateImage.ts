import type { RequestHandler } from 'express'
import { ApiError } from '../utils/ApiError'

export const validateImageSignature: RequestHandler = (request, _response, next) => {
  const file = request.file
  if (!file) return next(new ApiError(400, 'Choose an image to upload.'))
  const bytes = file.buffer
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  const webp = bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
  if (!(jpeg || png || webp)) return next(new ApiError(400, 'The uploaded file is not a valid JPG, PNG or WebP image.'))
  next()
}