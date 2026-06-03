import { Router } from 'express'
import multer from 'multer'
import { prisma } from '../prisma/client'
import { requireAuth } from '../middleware/auth'
import { ApiError } from '../utils/apiError'
import { extractText } from '../services/resume/parseService'

const router = Router()

const ALLOWED_MIMETYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
])

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMETYPES.has(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new ApiError(400, 'INVALID_FILE_TYPE', 'Only PDF and DOCX files are accepted'))
    }
  },
})

router.post('/upload', requireAuth, (req, res, next) => {
  upload.single('resume')(req, res, (err) => {
    if (err) return next(err)
    if (!req.file) {
      return next(ApiError.badRequest('No file uploaded'))
    }
    next()
  })
}, async (req, res, next) => {
  try {
    const file = req.file!
    let rawText = ''
    try {
      rawText = await extractText(file.buffer, file.mimetype)
    } catch {
      rawText = ''
    }

    const resume = await prisma.resume.create({
      data: {
        userId: req.user!.userId,
        filename: file.originalname,
        rawText,
        parsedData: {},
      },
    })

    res.status(201).json({ success: true, data: resume })
  } catch (err) {
    next(err)
  }
})

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const resumes = await prisma.resume.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, filename: true, createdAt: true },
    })
    res.json({ success: true, data: resumes })
  } catch (err) {
    next(err)
  }
})

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const resume = await prisma.resume.findFirst({
      where: { id: req.params['id'] as string, userId: req.user!.userId },
    })
    if (!resume) throw ApiError.notFound('Resume not found')
    res.json({ success: true, data: resume })
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const resume = await prisma.resume.findFirst({
      where: { id: req.params['id'] as string, userId: req.user!.userId },
    })
    if (!resume) throw ApiError.notFound('Resume not found')

    await prisma.resume.delete({ where: { id: resume.id } })
    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

export default router
