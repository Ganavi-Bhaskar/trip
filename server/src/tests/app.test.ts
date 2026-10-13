import type { Express } from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'

vi.hoisted(() => {
  process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/tripsplit-test'
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-jwt-validation'
  process.env.CLIENT_URL = 'http://localhost:5173'
})
import { app } from '../app'

describe('API envelope', () => {
  it('returns a successful health response without a database connection', async () => {
    const response = await request(app as Express).get('/api/health')
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ success: true, data: { status: 'ok' } })
  })

  it('returns a JSON 404 for unknown routes', async () => {
    const response = await request(app as Express).get('/api/not-a-route')
    expect(response.status).toBe(404)
    expect(response.body.success).toBe(false)
    expect(response.body.message).toContain('Route not found')
  })
})