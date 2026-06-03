import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

let prisma: PrismaClient

beforeAll(() => {
  const adapter = new PrismaPg({
    connectionString: process.env['DATABASE_URL_TEST'] ?? 'postgresql://mac@localhost:5432/workday_ai_test',
  })
  prisma = new PrismaClient({ adapter })
})

afterAll(async () => {
  await prisma.$disconnect()
})

beforeEach(async () => {
  await prisma.fieldMapping.deleteMany()
  await prisma.application.deleteMany()
  await prisma.resume.deleteMany()
  await prisma.user.deleteMany()
})

describe('User model', () => {
  it('creates and retrieves a user', async () => {
    const user = await prisma.user.create({
      data: { email: 'unit@test.com', passwordHash: 'hash123' },
    })
    expect(user.id).toBeDefined()
    expect(user.email).toBe('unit@test.com')

    const found = await prisma.user.findUnique({ where: { email: 'unit@test.com' } })
    expect(found?.id).toBe(user.id)
  })

  it('enforces unique email constraint', async () => {
    await prisma.user.create({ data: { email: 'dup@test.com', passwordHash: 'h' } })
    await expect(
      prisma.user.create({ data: { email: 'dup@test.com', passwordHash: 'h' } })
    ).rejects.toThrow()
  })
})

describe('Resume model', () => {
  it('creates a resume linked to a user', async () => {
    const user = await prisma.user.create({ data: { email: 'r@test.com', passwordHash: 'h' } })
    const resume = await prisma.resume.create({
      data: {
        userId: user.id,
        filename: 'cv.pdf',
        rawText: 'raw resume text',
        parsedData: { name: 'Test', email: 'r@test.com' },
      },
    })
    expect(resume.userId).toBe(user.id)
    expect(resume.filename).toBe('cv.pdf')
  })
})

describe('Application model', () => {
  it('creates application with field mappings', async () => {
    const user = await prisma.user.create({ data: { email: 'a@test.com', passwordHash: 'h' } })
    const resume = await prisma.resume.create({
      data: { userId: user.id, filename: 'r.pdf', rawText: 'text', parsedData: {} },
    })
    const app = await prisma.application.create({
      data: {
        userId: user.id,
        resumeId: resume.id,
        jobUrl: 'https://example.myworkdayjobs.com/job/123',
        jobTitle: 'Engineer',
        company: 'Acme',
        fieldMappings: {
          create: {
            fieldLabel: 'First Name',
            fieldType: 'text',
            mappedValue: 'John',
            confidence: 0.95,
          },
        },
      },
      include: { fieldMappings: true },
    })

    expect(app.company).toBe('Acme')
    expect(app.fieldMappings).toHaveLength(1)
    expect(app.fieldMappings[0]?.fieldLabel).toBe('First Name')
    expect(app.fieldMappings[0]?.confidence).toBe(0.95)
  })
})
