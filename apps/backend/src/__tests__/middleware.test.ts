import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { validate } from '../middleware/validate'
import { requireAuth } from '../middleware/auth'

const mockRes = () => {
  const res = {} as Response
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

const mockNext = () => jest.fn() as unknown as NextFunction

describe('validate middleware', () => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(6) })

  it('calls next() when body is valid', () => {
    const req = { body: { email: 'a@b.com', password: 'secret1' } } as Request
    const res = mockRes()
    const next = mockNext()

    validate(schema)(req, res, next)

    expect(next).toHaveBeenCalledWith()
  })

  it('responds 400 when body is invalid', () => {
    const req = { body: { email: 'not-an-email', password: '123' } } as Request
    const res = mockRes()
    const next = mockNext()

    validate(schema)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }))
    expect(next).not.toHaveBeenCalled()
  })

  it('responds 400 when body is missing required fields', () => {
    const req = { body: {} } as Request
    const res = mockRes()
    const next = mockNext()

    validate(schema)(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('replaces req.body with parsed (coerced) value', () => {
    const trimSchema = z.object({ name: z.string().trim() })
    const req = { body: { name: '  alice  ' } } as Request
    const res = mockRes()
    const next = mockNext()

    validate(trimSchema)(req, res, next)

    expect(req.body).toEqual({ name: 'alice' })
  })
})

describe('requireAuth middleware', () => {
  const secret = 'test-secret'
  const originalEnv = process.env['JWT_SECRET']

  beforeEach(() => {
    process.env['JWT_SECRET'] = secret
  })

  afterEach(() => {
    process.env['JWT_SECRET'] = originalEnv
  })

  it('calls next() with a valid Bearer token', () => {
    const token = jwt.sign({ userId: 'user-1', email: 'a@b.com' }, secret)
    const req = { headers: { authorization: `Bearer ${token}` } } as Request
    const res = mockRes()
    const next = mockNext()

    requireAuth(req, res, next)

    expect(next).toHaveBeenCalledWith()
    expect((req as Request & { user?: unknown }).user).toMatchObject({ userId: 'user-1' })
  })

  it('responds 401 when Authorization header is missing', () => {
    const req = { headers: {} } as Request
    const res = mockRes()
    const next = mockNext()

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('responds 401 when token is expired', () => {
    const token = jwt.sign({ userId: 'u1' }, secret, { expiresIn: -1 })
    const req = { headers: { authorization: `Bearer ${token}` } } as Request
    const res = mockRes()
    const next = mockNext()

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
  })

  it('responds 401 when token has wrong signature', () => {
    const token = jwt.sign({ userId: 'u1' }, 'wrong-secret')
    const req = { headers: { authorization: `Bearer ${token}` } } as Request
    const res = mockRes()
    const next = mockNext()

    requireAuth(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
  })
})
