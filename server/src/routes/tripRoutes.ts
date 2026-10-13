import { Router } from 'express'
import * as tripController from '../controllers/tripController'
import { requireAuth } from '../middleware/auth'
import { requireOrganizer, tripAccess } from '../middleware/tripAccess'
import { validateBody } from '../middleware/validate'
import { asyncHandler } from '../utils/asyncHandler'
import { joinTripSchema, tripCreateSchema, tripUpdateSchema } from '../validators/trip'
import travelerRoutes from './travelerRoutes'
import { z } from 'zod'
import { validateQuery } from '../middleware/validate'
import { tripActivityRoutes } from './activityRoutes'
import { tripExpenseRoutes } from './expenseRoutes'
import { tripBalanceRoutes, tripSettlementRoutes } from './balanceRoutes'
import { tripPhotoRoutes } from './photoRoutes'
import statsRoutes from './statsRoutes'

const router = Router()
router.use(requireAuth)
router.use('/:tripId/travelers', travelerRoutes)
router.use('/:tripId/activities', tripActivityRoutes)
router.use('/:tripId/expenses', tripExpenseRoutes)
router.use('/:tripId/balance', tripBalanceRoutes)
router.use('/:tripId/settlements', tripSettlementRoutes)
router.use('/:tripId/photos', tripPhotoRoutes)
router.use('/:tripId/stats', statsRoutes)
router.get('/', validateQuery(z.object({ search: z.string().max(120).optional() })), asyncHandler(tripController.list))
router.post('/join', validateBody(joinTripSchema), asyncHandler(tripController.joinTrip))
router.post('/', validateBody(tripCreateSchema), asyncHandler(tripController.create))
router.get('/:tripId', tripAccess, asyncHandler(tripController.get))
router.put('/:tripId', tripAccess, requireOrganizer, validateBody(tripUpdateSchema), asyncHandler(tripController.update))
router.delete('/:tripId', tripAccess, requireOrganizer, asyncHandler(tripController.remove))
router.get('/:tripId/members', tripAccess, asyncHandler(tripController.listMembers))
router.post('/:tripId/invitations/regenerate', tripAccess, requireOrganizer, asyncHandler(tripController.regenerateCode))
router.post('/:tripId/invitations/revoke', tripAccess, requireOrganizer, asyncHandler(tripController.revokeCode))
export default router