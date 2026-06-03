import request from 'supertest'
import app from '../app'
import { prisma } from '../prisma/client'

let token: string
let userId: string
let resumeId: string

beforeAll(async () => {
  await prisma.fieldMapping.deleteMany()
  await prisma.application.deleteMany()
  await prisma.resume.deleteMany()
  await prisma.user.deleteMany()

  const reg = await request(app)
    .post('/api/auth/register')
    .send({ email: 'apps@example.com', password: 'password123' })
  token = reg.body.data.token
  userId = reg.body.data.user.id

  const resume = await prisma.resume.create({
    data: { userId, filename: 'cv.pdf', rawText: 'text', parsedData: { name: 'Test' } },
  })
  resumeId = resume.id
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('POST /api/applications', () => {
  it('creates an application and returns it', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ resumeId, jobUrl: 'https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite/job/US-CA/Engineer_JR001' })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.jobUrl).toContain('myworkdayjobs.com')
    expect(res.body.data.status).toBe('not_started')
  })

  it('returns 400 when jobUrl is missing', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ resumeId })

    expect(res.status).toBe(400)
  })

  it('returns 400 when resumeId is missing', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${token}`)
      .send({ jobUrl: 'https://example.myworkdayjobs.com/job/1' })

    expect(res.status).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/applications')
      .send({ resumeId, jobUrl: 'https://example.myworkdayjobs.com/job/1' })

    expect(res.status).toBe(401)
  })
})

describe('GET /api/applications', () => {
  it('lists applications for the authenticated user', async () => {
    const res = await request(app)
      .get('/api/applications')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/applications')
    expect(res.status).toBe(401)
  })
})

describe('GET /api/applications/:id', () => {
  it('returns an application with field mappings', async () => {
    const app_ = await prisma.application.create({
      data: {
        userId,
        resumeId,
        jobUrl: 'https://example.myworkdayjobs.com/job/2',
        fieldMappings: {
          create: { fieldLabel: 'First Name', fieldType: 'text', mappedValue: 'John', confidence: 0.95 },
        },
      },
    })

    const res = await request(app)
      .get(`/api/applications/${app_.id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.fieldMappings).toHaveLength(1)
  })

  it('returns 404 for unknown id', async () => {
    const res = await request(app)
      .get('/api/applications/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/applications/:id/status', () => {
  it('updates the application status', async () => {
    const created = await prisma.application.create({
      data: { userId, resumeId, jobUrl: 'https://example.myworkdayjobs.com/job/3' },
    })

    const res = await request(app)
      .patch(`/api/applications/${created.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'in_progress' })

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('in_progress')
  })

  it('returns 400 for invalid status value', async () => {
    const created = await prisma.application.create({
      data: { userId, resumeId, jobUrl: 'https://example.myworkdayjobs.com/job/4' },
    })

    const res = await request(app)
      .patch(`/api/applications/${created.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'invalid_status' })

    expect(res.status).toBe(400)
  })
})

describe('GET /api/applications/:id/field-mappings', () => {
  it('returns only field mappings for an application', async () => {
    const created = await prisma.application.create({
      data: {
        userId,
        resumeId,
        jobUrl: 'https://example.myworkdayjobs.com/job/5',
        fieldMappings: {
          createMany: {
            data: [
              { fieldLabel: 'First Name', fieldType: 'text', mappedValue: 'John', confidence: 0.95 },
              { fieldLabel: 'Salary', fieldType: 'text', mappedValue: '', confidence: 0.3 },
            ],
          },
        },
      },
    })

    const res = await request(app)
      .get(`/api/applications/${created.id}/field-mappings`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.all).toHaveLength(2)
    expect(res.body.data.needsReview.length).toBeGreaterThan(0)
  })
})

describe('POST /api/applications/:id/submit-confirm', () => {
  it('marks the application as submitted', async () => {
    const created = await prisma.application.create({
      data: { userId, resumeId, jobUrl: 'https://example.myworkdayjobs.com/job/6' },
    })

    const res = await request(app)
      .post(`/api/applications/${created.id}/submit-confirm`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('submitted')
  })
})
