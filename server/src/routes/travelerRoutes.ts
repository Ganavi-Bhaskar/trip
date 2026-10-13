import { Router } from 'express'
import * as travelerController from '../controllers/travelerController'
import { requireAuth } from '../middleware/auth'
import { requireOrganizer, tripAccess } from '../middleware/tripAccess'
import { validateBody, validateObjectIdParam } from '../middleware/validate'
import { asyncHandler } from '../utils/asyncHandler'
import { travelerAddSchema, travelerUpdateSchema } from '../validators/traveler'

const router = Router({ mergeParams: true })
router.use(requireAuth, tripAccess)
router.get('/', asyncHandler(travelerController.list))
router.post('/', requireOrganizer, validateBody(travelerAddSchema), asyncHandler(travelerController.add))
router.patch('/:userId', validateObjectIdParam('userId'), requireOrganizer, validateBody(travelerUpdateSchema), asyncHandler(travelerController.update))
router.delete('/:userId', validateObjectIdParam('userId'), requireOrganizer, asyncHandler(travelerController.remove))
export default router