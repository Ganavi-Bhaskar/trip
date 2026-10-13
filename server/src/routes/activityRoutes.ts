import { Router } from 'express'
import * as activityController from '../controllers/activityController'
import { requireAuth } from '../middleware/auth'
import { tripAccess } from '../middleware/tripAccess'
import { validateBody, validateObjectIdParam, validateQuery } from '../middleware/validate'
import { asyncHandler } from '../utils/asyncHandler'
import { activityCreateSchema, activityUpdateSchema } from '../validators/activity'
import { z } from 'zod'

export const tripActivityRoutes = Router({ mergeParams: true })
tripActivityRoutes.use(requireAuth, tripAccess)
tripActivityRoutes.get('/', validateQuery(z.object({ day: z.coerce.number().int().min(1).optional() })), asyncHandler(activityController.list))
tripActivityRoutes.post('/', validateBody(activityCreateSchema), asyncHandler(activityController.create))

const activityRoutes = Router()
activityRoutes.use(requireAuth)
activityRoutes.put('/:activityId', validateObjectIdParam('activityId'), validateBody(activityUpdateSchema), asyncHandler(activityController.update))
activityRoutes.delete('/:activityId', validateObjectIdParam('activityId'), asyncHandler(activityController.remove))
export default activityRoutes