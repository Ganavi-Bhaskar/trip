import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { app } from '../server/src/app'
import { connectDatabase } from '../server/src/config/db'

const server = createServer(app)

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  await connectDatabase()
  server.emit('request', request, response)
}
