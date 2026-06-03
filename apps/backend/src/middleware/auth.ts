import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthPayload {
  userId: string
  email: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } })
    return
  }

  const token = header.slice(7)
  const secret = process.env['JWT_SECRET']
  if (!secret) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Server misconfigured' } })
    return
  }

  try {
    const payload = jwt.verify(token, secret) as AuthPayload
    req.user = payload
    next()
  } catch {
    res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } })
  }
}
