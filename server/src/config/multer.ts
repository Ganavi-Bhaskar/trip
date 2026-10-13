import multer from 'multer'
import { ApiError } from '../utils/ApiError'

const acceptedTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!acceptedTypes.has(file.mimetype)) return callback(new ApiError(400, 'Upload a JPG, PNG or WebP image.'))
    callback(null, true)
  },
})