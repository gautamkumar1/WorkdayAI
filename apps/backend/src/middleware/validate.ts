import type { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

export function validate<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: result.error.issues[0]?.message ?? 'Invalid input' },
      })
      return
    }
    req.body = result.data
    next()
  }
}
