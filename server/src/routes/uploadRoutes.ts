import { Router } from 'express'
import * as uploadController from '../controllers/uploadController'
import { imageUpload } from '../config/multer'
import { requireAuth } from '../middleware/auth'
import { validateImageSignature } from '../middleware/validateImage'
import { requireTripOrganizerForCover } from '../middleware/uploadPermissions'

const router = Router()
router.use(requireAuth)
router.post('/avatar', imageUpload.single('file'), validateImageSignature, uploadController.avatar)
router.post('/trip-cover', imageUpload.single('file'), validateImageSignature, requireTripOrganizerForCover, uploadController.tripCover)
router.post('/photo', imageUpload.single('file'), validateImageSignature, uploadController.photo)
export default router