import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../prisma/client'
import { validate } from '../middleware/validate'
import { requireAuth } from '../middleware/auth'
import { ApiError } from '../utils/apiError'

const router: ReturnType<typeof Router> = Router()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

function signToken(userId: string, email: string): string {
  const secret = process.env['JWT_SECRET']
  if (!secret) throw new Error('JWT_SECRET not set')
  return jwt.sign({ userId, email }, secret, { expiresIn: '7d' })
}

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as z.infer<typeof registerSchema>

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new ApiError(409, 'EMAIL_TAKEN', 'Email already registered')
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({ data: { email, passwordHash } })
    const token = signToken(user.id, user.email)

    res.status(201).json({
      success: true,
      data: { token, user: { id: user.id, email: user.email } },
    })
  } catch (err) {
    next(err)
  }
})

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) throw ApiError.unauthorized('Invalid credentials')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw ApiError.unauthorized('Invalid credentials')

    const token = signToken(user.id, user.email)
    res.json({ success: true, data: { token, user: { id: user.id, email: user.email } } })
  } catch (err) {
    next(err)
  }
})

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, email: true, createdAt: true },
    })
    if (!user) throw ApiError.notFound('User not found')

    res.json({ success: true, data: user })
  } catch (err) {
    next(err)
  }
})

export default router
