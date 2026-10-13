import type { RequestHandler } from 'express'
import * as authService from '../services/authService'

export const register: RequestHandler = async (request, response) => {
  const data = await authService.register(request.body as { name: string; email: string; password: string })
  response.status(201).json({ success: true, data })
}

export const login: RequestHandler = async (request, response) => {
  const data = await authService.login(request.body as { email: string; password: string })
  response.json({ success: true, data })
}

export const me: RequestHandler = async (request, response) => {
  const user = await authService.getSession(request.authUserId ?? '')
  response.json({ success: true, data: { user } })
}