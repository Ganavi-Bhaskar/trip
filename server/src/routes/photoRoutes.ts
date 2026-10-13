import { Router } from 'express'
import * as photoController from '../controllers/photoController'
import { imageUpload } from '../config/multer'
import { requireAuth } from '../middleware/auth'
import { tripAccess } from '../middleware/tripAccess'
import { validateBody, validateObjectIdParam } from '../middleware/validate'
import { validateImageSignature } from '../middleware/validateImage'
import { asyncHandler } from '../utils/asyncHandler'
import { photoMetadataSchema } from '../validators/photo'

export const tripPhotoRoutes = Router({ mergeParams: true })
tripPhotoRoutes.use(requireAuth, tripAccess)
tripPhotoRoutes.get('/', asyncHandler(photoController.list))
tripPhotoRoutes.post('/', imageUpload.single('file'), validateImageSignature, validateBody(photoMetadataSchema), asyncHandler(photoController.create))

const photoRoutes = Router()
photoRoutes.delete('/:photoId', requireAuth, validateObjectIdParam('photoId'), asyncHandler(photoController.remove))
export default photoRoutes