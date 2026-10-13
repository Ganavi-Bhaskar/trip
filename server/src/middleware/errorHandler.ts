import type { ErrorRequestHandler } from 'express'
import mongoose from 'mongoose'
import multer from 'multer'
import { ZodError } from 'zod'
import { ApiError } from '../utils/ApiError'

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({ success: false, message: error.message, ...(error.errors ? { errors: error.errors } : {}) })
    return
  }
  if (error instanceof ZodError) {
    const errors = Object.fromEntries(error.issues.map((issue) => [String(issue.path[0] ?? 'body'), issue.message]))
    response.status(400).json({ success: false, message: 'Please check the highlighted fields.', errors })
    return
  }
  if (error instanceof mongoose.Error.ValidationError) {
    const errors = Object.fromEntries(Object.entries(error.errors).map(([key, issue]) => [key, issue.message]))
    response.status(400).json({ success: false, message: 'Please check the submitted information.', errors })
    return
  }
  if (error instanceof mongoose.Error.CastError) {
    response.status(400).json({ success: false, message: 'The requested item is invalid.' })
    return
  }
  if (error instanceof multer.MulterError) {
    response.status(400).json({ success: false, message: error.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5 MB or smaller.' : 'The uploaded image could not be processed.' })
    return
  }
  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
    response.status(409).json({ success: false, message: 'That email is already registered.' })
    return
  }
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.'
  response.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Something went wrong.' : message })
}