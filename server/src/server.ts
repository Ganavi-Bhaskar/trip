import { env } from './config/env'
import { app } from './app'
import { connectDatabase } from './config/db'

void connectDatabase().then(() => {
  app.listen(env.PORT, () => console.log(`TripSplit API listening on port ${env.PORT}`))
}).catch((error: unknown) => {
  console.error('Could not connect to MongoDB:', error)
  process.exitCode = 1
})