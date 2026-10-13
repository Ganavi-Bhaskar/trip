import type { RequestHandler } from 'express'
import { z, type ZodType } from 'zod'
import { ApiError } from '../utils/ApiError'

export function validateBody(schema: ZodType): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.body)
    if (!result.success) {
      const errors = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0] ?? 'body'), issue.message]))
      return next(new ApiError(400, 'Please check the highlighted fields.', errors))
    }
    request.body = result.data
    next()
  }
}

export function validateQuery(schema: ZodType): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request.query)
    if (!result.success) {
      const errors = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0] ?? 'query'), issue.message]))
      return next(new ApiError(400, 'Please check the query parameters.', errors))
    }
    next()
  }
}

export function validateObjectIdParam(name: string): RequestHandler {
  const schema = z.object({ [name]: z.string().regex(/^[a-f\d]{24}$/i, 'This identifier is invalid.') })
  return (request, _response, next) => {
    const result = schema.safeParse(request.params)
    if (!result.success) {
      const errors = Object.fromEntries(result.error.issues.map((issue) => [String(issue.path[0] ?? name), issue.message]))
      return next(new ApiError(400, 'The requested item is invalid.', errors))
    }
    next()
  }
}