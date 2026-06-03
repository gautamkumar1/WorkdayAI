import request from 'supertest'
import express from 'express'
import { errorHandler } from '../middleware/errorHandler'
import { ApiError } from '../utils/apiError'

function makeApp(throwFn: () => void) {
  const app = express()
  app.get('/test', (_req, _res, next) => {
    try {
      throwFn()
    } catch (e) {
      next(e)
    }
  })
  app.use(errorHandler)
  return app
}

describe('errorHandler middleware', () => {
  it('returns structured error for ApiError', async () => {
    const app = makeApp(() => {
      throw ApiError.notFound('Item missing')
    })
    const res = await request(app).get('/test')
    expect(res.status).toBe(404)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('NOT_FOUND')
    expect(res.body.error.message).toBe('Item missing')
  })

  it('returns 500 for unknown errors', async () => {
    const app = makeApp(() => {
      throw new Error('Something broke')
    })
    const res = await request(app).get('/test')
    expect(res.status).toBe(500)
    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('INTERNAL_ERROR')
  })
})
