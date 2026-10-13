import type { RequestHandler } from 'express'
import * as expenseService from '../services/expenseService'

export const list: RequestHandler = async (request, response) => {
  const expenses = await expenseService.listExpenses(String(request.params.tripId ?? ''), request.query.category ? String(request.query.category) : undefined)
  response.json({ success: true, data: { expenses } })
}

export const create: RequestHandler = async (request, response) => {
  const expense = await expenseService.createExpense(String(request.params.tripId ?? ''), request.authUserId ?? '', request.body as Parameters<typeof expenseService.createExpense>[2])
  response.status(201).json({ success: true, data: { expense } })
}

export const get: RequestHandler = async (request, response) => {
  const expense = await expenseService.getExpense(String(request.params.expenseId ?? ''), request.authUserId ?? '')
  response.json({ success: true, data: { expense } })
}

export const update: RequestHandler = async (request, response) => {
  const expense = await expenseService.updateExpense(String(request.params.expenseId ?? ''), request.authUserId ?? '', request.body as Parameters<typeof expenseService.updateExpense>[2])
  response.json({ success: true, data: { expense } })
}

export const remove: RequestHandler = async (request, response) => {
  await expenseService.deleteExpense(String(request.params.expenseId ?? ''), request.authUserId ?? '')
  response.json({ success: true, data: { message: 'Expense deleted.' } })
}