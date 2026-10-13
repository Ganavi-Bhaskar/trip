import { Router } from 'express'
import * as balanceController from '../controllers/balanceController'
import { requireAuth } from '../middleware/auth'
import { tripAccess } from '../middleware/tripAccess'
import { asyncHandler } from '../utils/asyncHandler'
import { validateObjectIdParam } from '../middleware/validate'

export const tripBalanceRoutes = Router({ mergeParams: true })
tripBalanceRoutes.use(requireAuth, tripAccess)
tripBalanceRoutes.get('/', asyncHandler(balanceController.balance))

export const tripSettlementRoutes = Router({ mergeParams: true })
tripSettlementRoutes.use(requireAuth, tripAccess)
tripSettlementRoutes.get('/', asyncHandler(balanceController.settlements))

const settlementRoutes = Router()
settlementRoutes.post('/:settlementId/settle', requireAuth, validateObjectIdParam('settlementId'), asyncHandler(balanceController.markSettled))
export default settlementRoutes