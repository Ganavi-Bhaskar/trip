import { Router } from 'express'
import * as userController from '../controllers/userController'
import { requireAuth } from '../middleware/auth'
import { validateBody } from '../middleware/validate'
import { asyncHandler } from '../utils/asyncHandler'
import { accountDeleteSchema, passwordChangeSchema, profileSchema } from '../validators/user'

const router = Router()
router.use(requireAuth)
router.put('/me', validateBody(profileSchema), asyncHandler(userController.update))
router.put('/me/password', validateBody(passwordChangeSchema), asyncHandler(userController.password))
router.delete('/me', validateBody(accountDeleteSchema), asyncHandler(userController.remove))
export default router