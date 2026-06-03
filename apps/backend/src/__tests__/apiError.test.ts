import { ApiError } from '../utils/apiError'

describe('ApiError', () => {
  it('creates a 400 bad request error', () => {
    const err = ApiError.badRequest('missing field')
    expect(err.statusCode).toBe(400)
    expect(err.code).toBe('BAD_REQUEST')
    expect(err.message).toBe('missing field')
  })

  it('creates a 401 unauthorized error', () => {
    const err = ApiError.unauthorized()
    expect(err.statusCode).toBe(401)
    expect(err.code).toBe('UNAUTHORIZED')
  })

  it('creates a 404 not found error', () => {
    const err = ApiError.notFound('Resume not found')
    expect(err.statusCode).toBe(404)
    expect(err.message).toBe('Resume not found')
  })

  it('creates a 500 internal error', () => {
    const err = ApiError.internal()
    expect(err.statusCode).toBe(500)
    expect(err.code).toBe('INTERNAL_ERROR')
  })

  it('is an instance of Error', () => {
    const err = ApiError.badRequest('test')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ApiError)
  })
})
