import { Router } from 'express'
import { stats } from '../controllers/statsController'
import { requireAuth } from '../middleware/auth'
import { tripAccess } from '../middleware/tripAccess'
import { asyncHandler } from '../utils/asyncHandler'

const router = Router({ mergeParams: true })
router.use(requireAuth, tripAccess)
router.get('/', asyncHandler(stats))
export default router