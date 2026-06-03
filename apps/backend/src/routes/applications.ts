import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../prisma/client'
import { requireAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { ApiError } from '../utils/apiError'

const router: ReturnType<typeof Router> = Router()

const VALID_STATUSES = ['not_started', 'in_progress', 'paused', 'submitted', 'failed'] as const

const createSchema = z.object({
  resumeId: z.string().min(1),
  jobUrl: z.string().url(),
  jobTitle: z.string().optional(),
  company: z.string().optional(),
})

const statusSchema = z.object({
  status: z.enum(VALID_STATUSES),
})

router.post('/', requireAuth, validate(createSchema), async (req, res, next) => {
  try {
    const { resumeId, jobUrl, jobTitle, company } = req.body as z.infer<typeof createSchema>

    const resume = await prisma.resume.findFirst({
      where: { id: resumeId, userId: req.user!.userId },
    })
    if (!resume) throw ApiError.notFound('Resume not found')

    const application = await prisma.application.create({
      data: {
        userId: req.user!.userId,
        resumeId,
        jobUrl,
        jobTitle: jobTitle ?? null,
        company: company ?? null,
      },
    })

    res.status(201).json({ success: true, data: application })
  } catch (err) {
    next(err)
  }
})

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const applications = await prisma.application.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        jobUrl: true,
        jobTitle: true,
        company: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    res.json({ success: true, data: applications })
  } catch (err) {
    next(err)
  }
})

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const application = await prisma.application.findFirst({
      where: { id: req.params['id'] as string, userId: req.user!.userId },
      include: { fieldMappings: true },
    })
    if (!application) throw ApiError.notFound('Application not found')
    res.json({ success: true, data: application })
  } catch (err) {
    next(err)
  }
})

router.patch('/:id/status', requireAuth, validate(statusSchema), async (req, res, next) => {
  try {
    const { status } = req.body as z.infer<typeof statusSchema>

    const existing = await prisma.application.findFirst({
      where: { id: req.params['id'] as string, userId: req.user!.userId },
    })
    if (!existing) throw ApiError.notFound('Application not found')

    const updated = await prisma.application.update({
      where: { id: existing.id },
      data: { status },
    })

    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
})

router.get('/:id/field-mappings', requireAuth, async (req, res, next) => {
  try {
    const application = await prisma.application.findFirst({
      where: { id: req.params['id'] as string, userId: req.user!.userId },
    })
    if (!application) throw ApiError.notFound('Application not found')

    const mappings = await prisma.fieldMapping.findMany({
      where: { applicationId: application.id },
      orderBy: { createdAt: 'asc' },
    })

    const needsReview = mappings.filter((m) => m.confidence < 0.6)
    res.json({ success: true, data: { all: mappings, needsReview } })
  } catch (err) {
    next(err)
  }
})

router.post('/:id/submit-confirm', requireAuth, async (req, res, next) => {
  try {
    const existing = await prisma.application.findFirst({
      where: { id: req.params['id'] as string, userId: req.user!.userId },
    })
    if (!existing) throw ApiError.notFound('Application not found')

    const updated = await prisma.application.update({
      where: { id: existing.id },
      data: { status: 'submitted' },
    })

    res.json({ success: true, data: updated })
  } catch (err) {
    next(err)
  }
})

export default router
