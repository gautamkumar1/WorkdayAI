import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { z } from 'zod'
import { getDefaultModel, getMaxTokens } from './openaiClient'

const AnswerSchema = z.object({
  answer: z.string(),
  confidence: z.number().min(0).max(1),
  fallback: z.string(),
  needsReview: z.boolean(),
})

export type GeneratedAnswer = z.infer<typeof AnswerSchema>

const SENSITIVE_KEYWORDS = [
  'salary',
  'compensation',
  'visa',
  'authorization',
  'clearance',
  'sponsorship',
]

const SYSTEM_PROMPT = `You are a job application assistant. Answer application questions using the provided resume context.

Return a JSON object:
{{
  "answer": string,
  "confidence": number (0.0–1.0),
  "fallback": string,
  "needsReview": boolean
}}

Rules:
- needsReview: true when the question involves salary, visa status, work authorization, or security clearance
- fallback: a safe, neutral alternative answer used when confidence < 0.7
- Keep answers concise and professional
- Return ONLY the JSON object, no explanation text`

const parser = new JsonOutputParser()

async function invokeChain(question: string, resumeData: string): Promise<unknown> {
  const model = new ChatOpenAI({
    model: getDefaultModel(),
    temperature: 0.2,
    maxTokens: getMaxTokens(),
  })
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', SYSTEM_PROMPT],
    ['human', 'Question: {question}\n\nResume context:\n{resumeData}'],
  ])
  const messages = await prompt.invoke({ question, resumeData })
  const response = await model.invoke(messages)
  return parser.invoke(response)
}

export async function generateAnswerWithAI(
  question: string,
  resumeData: Record<string, unknown>,
): Promise<GeneratedAnswer> {
  const output = await invokeChain(question, JSON.stringify(resumeData, null, 2))
  const parsed = AnswerSchema.parse(output)

  // Override needsReview for sensitive topics regardless of model's assessment
  const isSensitive = SENSITIVE_KEYWORDS.some((kw) => question.toLowerCase().includes(kw))
  if (isSensitive) parsed.needsReview = true

  return parsed
}
