import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { login, me, register } from '../controllers/authController'
import { requireAuth } from '../middleware/auth'
import { validateBody } from '../middleware/validate'
import { asyncHandler } from '../utils/asyncHandler'
import { loginSchema, registerSchema } from '../validators/auth'

const router = Router()
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false })

router.post('/register', authLimiter, validateBody(registerSchema), asyncHandler(register))
router.post('/login', authLimiter, validateBody(loginSchema), asyncHandler(login))
router.get('/me', requireAuth, asyncHandler(me))

export default router