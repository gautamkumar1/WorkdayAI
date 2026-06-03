import request from 'supertest'
import app from '../app'
import { prisma } from '../prisma/client'

// Mock the AI chains so tests don't hit OpenAI
jest.mock('../services/ai/resumeParsingChain', () => ({
  parseResumeWithAI: jest.fn().mockResolvedValue({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '555-1234',
    location: 'San Francisco, CA',
    summary: 'Experienced software engineer.',
    experience: [],
    education: [],
    skills: ['TypeScript', 'React'],
    certifications: [],
    links: {},
  }),
}))

jest.mock('../services/ai/fieldMappingChain', () => ({
  mapFieldsWithAI: jest.fn().mockResolvedValue([
    { fieldLabel: 'First Name', value: 'John', confidence: 0.98, reasoning: 'Matched name.first' },
    { fieldLabel: 'Email Address', value: 'john@example.com', confidence: 0.99, reasoning: 'Direct email match' },
    { fieldLabel: 'Work Authorization', value: 'Unknown', confidence: 0.4, reasoning: 'Could not determine' },
  ]),
}))

jest.mock('../services/ai/answerGenerationChain', () => ({
  generateAnswerWithAI: jest.fn().mockResolvedValue({
    answer: 'Yes, I am authorized to work in the US.',
    confidence: 0.85,
    fallback: 'Please confirm your work authorization status.',
  }),
}))

let token: string

beforeAll(async () => {
  await prisma.fieldMapping.deleteMany()
  await prisma.application.deleteMany()
  await prisma.resume.deleteMany()
  await prisma.user.deleteMany()

  const reg = await request(app)
    .post('/api/auth/register')
    .send({ email: 'ai@example.com', password: 'password123' })
  token = reg.body.data.token
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe('POST /api/ai/parse-resume', () => {
  it('parses raw resume text and returns structured JSON', async () => {
    const res = await request(app)
      .post('/api/ai/parse-resume')
      .set('Authorization', `Bearer ${token}`)
      .send({ rawText: 'John Doe\njohn@example.com\nSoftware Engineer' })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.name).toBe('John Doe')
    expect(res.body.data.email).toBe('john@example.com')
  })

  it('returns 400 when rawText is missing', async () => {
    const res = await request(app)
      .post('/api/ai/parse-resume')
      .set('Authorization', `Bearer ${token}`)
      .send({})

    expect(res.status).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app)
      .post('/api/ai/parse-resume')
      .send({ rawText: 'some text' })

    expect(res.status).toBe(401)
  })
})

describe('POST /api/ai/map-fields', () => {
  it('maps form fields to resume data and flags low-confidence items', async () => {
    const res = await request(app)
      .post('/api/ai/map-fields')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fields: [
          { label: 'First Name', type: 'text' },
          { label: 'Email Address', type: 'text' },
          { label: 'Work Authorization', type: 'dropdown', options: ['Yes', 'No'] },
        ],
        resumeData: { name: 'John Doe', email: 'john@example.com' },
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data.mappings)).toBe(true)
    expect(res.body.data.mappings).toHaveLength(3)

    const lowConf = res.body.data.mappings.filter((m: { confidence: number }) => m.confidence < 0.6)
    expect(lowConf.length).toBeGreaterThan(0)
    expect(res.body.data.needsReview).toBeDefined()
  })

  it('returns 400 when fields or resumeData is missing', async () => {
    const res = await request(app)
      .post('/api/ai/map-fields')
      .set('Authorization', `Bearer ${token}`)
      .send({ fields: [] })

    expect(res.status).toBe(400)
  })
})

describe('POST /api/ai/answer-question', () => {
  it('generates an answer for a custom application question', async () => {
    const res = await request(app)
      .post('/api/ai/answer-question')
      .set('Authorization', `Bearer ${token}`)
      .send({
        question: 'Are you authorized to work in the US?',
        resumeData: { name: 'John Doe', email: 'john@example.com' },
      })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.answer).toBeDefined()
    expect(typeof res.body.data.confidence).toBe('number')
  })

  it('returns 400 when question is missing', async () => {
    const res = await request(app)
      .post('/api/ai/answer-question')
      .set('Authorization', `Bearer ${token}`)
      .send({ resumeData: {} })

    expect(res.status).toBe(400)
  })
})
