import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import morgan from 'morgan'
import authRoutes from './routes/authRoutes'
import { errorHandler } from './middleware/errorHandler'
import tripRoutes from './routes/tripRoutes'
import activityRoutes from './routes/activityRoutes'
import expenseRoutes from './routes/expenseRoutes'
import settlementRoutes from './routes/balanceRoutes'
import uploadRoutes from './routes/uploadRoutes'
import photoRoutes from './routes/photoRoutes'
import path from 'node:path'
import userRoutes from './routes/userRoutes'
import { notFound } from './middleware/notFound'

export const app = express()

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))
app.use(morgan('dev'))
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')))

app.get('/api/health', (_request, response) => {
  response.json({ success: true, data: { status: 'ok' } })
})

app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/trips', tripRoutes)
app.use('/api/activities', activityRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/settlements', settlementRoutes)
app.use('/api/photos', photoRoutes)
app.use('/api/upload', uploadRoutes)
app.use(notFound)
app.use(errorHandler)