import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL'] ?? 'postgresql://mac@localhost:5432/workday_ai',
})
const prisma = new PrismaClient({ adapter })

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'test@example.com' } })
  if (existing) {
    console.log('Seed already applied, skipping.')
    return
  }

  const hash = await bcrypt.hash('password123', 12)
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      passwordHash: hash,
      resumes: {
        create: {
          filename: 'sample-resume.pdf',
          rawText: 'John Doe\njohn@example.com\nSoftware Engineer with 5 years experience.',
          parsedData: {
            name: 'John Doe',
            email: 'john@example.com',
            phone: null,
            location: 'San Francisco, CA',
            summary: 'Software Engineer with 5 years experience.',
            experience: [],
            education: [],
            skills: ['TypeScript', 'React', 'Node.js'],
            certifications: [],
            links: {},
          },
        },
      },
    },
  })

  console.log(`Seeded user: ${user.email}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
