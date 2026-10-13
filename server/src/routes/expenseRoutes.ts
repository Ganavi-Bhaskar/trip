import { Router } from 'express'
import * as expenseController from '../controllers/expenseController'
import { requireAuth } from '../middleware/auth'
import { tripAccess } from '../middleware/tripAccess'
import { validateBody, validateObjectIdParam, validateQuery } from '../middleware/validate'
import { asyncHandler } from '../utils/asyncHandler'
import { expenseCreateSchema, expenseUpdateSchema } from '../validators/expense'
import { z } from 'zod'

export const tripExpenseRoutes = Router({ mergeParams: true })
tripExpenseRoutes.use(requireAuth, tripAccess)
tripExpenseRoutes.get('/', validateQuery(z.object({ category: z.enum(['all', 'food', 'stay', 'transport', 'activities', 'shopping', 'other']).optional() })), asyncHandler(expenseController.list))
tripExpenseRoutes.post('/', validateBody(expenseCreateSchema), asyncHandler(expenseController.create))

const expenseRoutes = Router()
expenseRoutes.use(requireAuth)
expenseRoutes.get('/:expenseId', validateObjectIdParam('expenseId'), asyncHandler(expenseController.get))
expenseRoutes.put('/:expenseId', validateObjectIdParam('expenseId'), validateBody(expenseUpdateSchema), asyncHandler(expenseController.update))
expenseRoutes.delete('/:expenseId', validateObjectIdParam('expenseId'), asyncHandler(expenseController.remove))
export default expenseRoutes