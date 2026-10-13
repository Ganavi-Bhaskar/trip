import mongoose from 'mongoose'
import { env } from './env'

let connection: Promise<typeof mongoose> | null = null

export async function connectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) return
  connection ??= mongoose.connect(env.MONGO_URI).then((connected) => {
    console.log('Connected to MongoDB')
    return connected
  }).catch((error: unknown) => {
    connection = null
    throw error
  })
  await connection
}