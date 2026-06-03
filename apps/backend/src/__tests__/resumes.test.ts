import request from 'supertest'
import app from '../app'
import { prisma } from '../prisma/client'

let token: string
let userId: string

beforeAll(async () => {
  await prisma.fieldMapping.deleteMany()
  await prisma.application.deleteMany()
  await prisma.resume.deleteMany()
  await prisma.user.deleteMany()

  const reg = await request(app)
    .post('/api/auth/register')
    .send({ email: 'resume@example.com', password: 'password123' })
  token = reg.body.data.token
  userId = reg.body.data.user.id
})

afterAll(async () => {
  await prisma.$disconnect()
})

// Create minimal valid PDF bytes for upload tests
const minimalPdfBuffer = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\n' +
    'xref\n0 4\n0000000000 65535 f\n' +
    '0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n' +
    'trailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF',
)

describe('POST /api/resumes/upload', () => {
  it('uploads a PDF and returns parsed resume data', async () => {
    const res = await request(app)
      .post('/api/resumes/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', minimalPdfBuffer, { filename: 'test.pdf', contentType: 'application/pdf' })

    expect(res.status).toBe(201)
    expect(res.body.success).toBe(true)
    expect(res.body.data.filename).toBe('test.pdf')
    expect(res.body.data.id).toBeDefined()
  })

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/resumes/upload')
      .attach('resume', minimalPdfBuffer, { filename: 'test.pdf', contentType: 'application/pdf' })

    expect(res.status).toBe(401)
  })

  it('returns 400 when no file is sent', async () => {
    const res = await request(app)
      .post('/api/resumes/upload')
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(res.status).toBe(400)
  })

  it('returns 400 for non-PDF/DOCX file type', async () => {
    const res = await request(app)
      .post('/api/resumes/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('resume', Buffer.from('plain text'), {
        filename: 'resume.txt',
        contentType: 'text/plain',
      })

    expect(res.status).toBe(400)
  })
})

describe('GET /api/resumes', () => {
  it('lists resumes for the authenticated user', async () => {
    const res = await request(app).get('/api/resumes').set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/resumes')
    expect(res.status).toBe(401)
  })
})

describe('GET /api/resumes/:id', () => {
  it('returns a single resume with parsed data', async () => {
    const created = await prisma.resume.create({
      data: { userId, filename: 'cv.pdf', rawText: 'Jane Doe', parsedData: { name: 'Jane Doe' } },
    })

    const res = await request(app)
      .get(`/api/resumes/${created.id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(created.id)
    expect(res.body.data.parsedData).toBeDefined()
  })

  it('returns 404 for unknown id', async () => {
    const res = await request(app)
      .get('/api/resumes/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })

  it('returns 404 when resume belongs to another user', async () => {
    const other = await prisma.user.create({ data: { email: 'other@x.com', passwordHash: 'h' } })
    const resume = await prisma.resume.create({
      data: { userId: other.id, filename: 'r.pdf', rawText: 'x', parsedData: {} },
    })

    const res = await request(app)
      .get(`/api/resumes/${resume.id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/resumes/:id', () => {
  it('deletes a resume and returns 204', async () => {
    const created = await prisma.resume.create({
      data: { userId, filename: 'del.pdf', rawText: 'text', parsedData: {} },
    })

    const res = await request(app)
      .delete(`/api/resumes/${created.id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(204)

    const found = await prisma.resume.findUnique({ where: { id: created.id } })
    expect(found).toBeNull()
  })

  it('returns 404 when deleting another user resume', async () => {
    const other = await prisma.user.create({ data: { email: 'o2@x.com', passwordHash: 'h' } })
    const resume = await prisma.resume.create({
      data: { userId: other.id, filename: 'r.pdf', rawText: 'x', parsedData: {} },
    })

    const res = await request(app)
      .delete(`/api/resumes/${resume.id}`)
      .set('Authorization', `Bearer ${token}`)

    expect(res.status).toBe(404)
  })
})
