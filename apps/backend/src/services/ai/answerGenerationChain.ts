import { getOpenAIClient } from './openaiClient'
import { z } from 'zod'

const AnswerSchema = z.object({
  answer: z.string(),
  confidence: z.number().min(0).max(1),
  fallback: z.string(),
  needsReview: z.boolean(),
})

export type GeneratedAnswer = z.infer<typeof AnswerSchema>

const SENSITIVE_KEYWORDS = ['salary', 'compensation', 'visa', 'authorization', 'clearance', 'sponsorship']

const SYSTEM_PROMPT = `You are a job application assistant. Answer application questions using the provided resume context.
Return a JSON object: {"answer": string, "confidence": 0-1, "fallback": string, "needsReview": boolean}.
- needsReview: true if the question is about salary, visa status, work authorization, or security clearance
- fallback: a safe alternative answer when confidence < 0.7
Return ONLY the JSON object.`

export async function generateAnswerWithAI(
  question: string,
  resumeData: Record<string, unknown>
): Promise<GeneratedAnswer> {
  const client = getOpenAIClient()

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Question: ${question}\n\nResume context: ${JSON.stringify(resumeData)}` },
    ],
  })

  const json = JSON.parse(response.choices[0]?.message?.content ?? '{}')
  const parsed = AnswerSchema.parse(json)

  const isSensitive = SENSITIVE_KEYWORDS.some((kw) => question.toLowerCase().includes(kw))
  if (isSensitive) parsed.needsReview = true

  return parsed
}
