import type { RequestHandler } from 'express'
import * as userService from '../services/userService'

export const update: RequestHandler = async (request, response) => {
  const user = await userService.updateProfile(request.authUserId ?? '', request.body as Parameters<typeof userService.updateProfile>[1])
  response.json({ success: true, data: { user } })
}

export const password: RequestHandler = async (request, response) => {
  await userService.changePassword(request.authUserId ?? '', request.body as { currentPassword: string; newPassword: string })
  response.json({ success: true, data: { message: 'Password updated.' } })
}

export const remove: RequestHandler = async (request, response) => {
  await userService.deleteAccount(request.authUserId ?? '', String((request.body as { password: string }).password))
  response.json({ success: true, data: { message: 'Account deleted.' } })
}