import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { parseResumeWithAI } from '../services/ai/resumeParsingChain'
import { mapFieldsWithAI } from '../services/ai/fieldMappingChain'
import { generateAnswerWithAI } from '../services/ai/answerGenerationChain'

const router: ReturnType<typeof Router> = Router()

const parseResumeSchema = z.object({
  rawText: z.string().min(1),
})

const mapFieldsSchema = z.object({
  fields: z.array(z.object({ label: z.string(), type: z.string(), options: z.array(z.string()).optional() })),
  resumeData: z.record(z.string(), z.unknown()),
})

const answerQuestionSchema = z.object({
  question: z.string().min(1),
  resumeData: z.record(z.string(), z.unknown()),
})

router.post('/parse-resume', requireAuth, validate(parseResumeSchema), async (req, res, next) => {
  try {
    const { rawText } = req.body as z.infer<typeof parseResumeSchema>
    const parsed = await parseResumeWithAI(rawText)
    res.json({ success: true, data: parsed })
  } catch (err) {
    next(err)
  }
})

router.post('/map-fields', requireAuth, validate(mapFieldsSchema), async (req, res, next) => {
  try {
    const { fields, resumeData } = req.body as z.infer<typeof mapFieldsSchema>
    const mappings = await mapFieldsWithAI(fields as Parameters<typeof mapFieldsWithAI>[0], resumeData)

    const needsReview = mappings.filter((m) => m.confidence < 0.6)
    res.json({ success: true, data: { mappings, needsReview } })
  } catch (err) {
    next(err)
  }
})

router.post('/answer-question', requireAuth, validate(answerQuestionSchema), async (req, res, next) => {
  try {
    const { question, resumeData } = req.body as z.infer<typeof answerQuestionSchema>
    const result = await generateAnswerWithAI(question, resumeData)
    res.json({ success: true, data: result })
  } catch (err) {
    next(err)
  }
})

export default router
