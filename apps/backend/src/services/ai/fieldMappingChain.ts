import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { z } from 'zod'
import { getDefaultModel, getMaxTokens } from './openaiClient'

export interface FieldDescriptor {
  label: string
  type: string
  options?: string[]
}

const MappingItemSchema = z.object({
  fieldLabel: z.string(),
  value: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
})

const MappingSchema = z.array(MappingItemSchema)

export type FieldMappingResult = z.infer<typeof MappingSchema>

const SYSTEM_PROMPT = `You are a form-filling assistant. Semantically map Workday form fields to resume data.

Rules:
- For each field return: fieldLabel, value, confidence (0.0–1.0), reasoning
- confidence >= 0.8: high-confidence direct match (e.g. "First Name" → firstName)
- confidence 0.6–0.8: inferred match (e.g. "Given Name" → firstName)
- confidence < 0.6: uncertain, not enough context
- For dropdown fields, value MUST be one of the provided options exactly
- For missing data, return value="" with confidence=0.0
- Wrap the array in {{"mappings": [...]}}
- Return ONLY the JSON object, no explanation text

Smart defaults (use when data is absent but answer is logically inferable):
- "Have you previously worked for [Company]?" → default "No" with confidence=0.75 unless resume shows that company in experience
- "Are you legally authorized to work?" → default "Yes" with confidence=0.7
- "Will you now or in future require sponsorship?" → default "No" with confidence=0.65
- "Local Given Name" / "Local Family Name" → use same value as Given Name / Family Name with confidence=0.7
- If location has a city, use it for "City" field
- Split phone: if phone starts with country code (+XX), put country code in "Country Phone Code" and rest in "Phone Number"`

const parser = new JsonOutputParser()

async function invokeChain(fields: string, resumeData: string): Promise<unknown> {
  const model = new ChatOpenAI({
    model: getDefaultModel(),
    temperature: 0,
    maxTokens: getMaxTokens(),
  })
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', SYSTEM_PROMPT],
    ['human', 'Form fields:\n{fields}\n\nResume data:\n{resumeData}\n\nMap each field.'],
  ])
  const messages = await prompt.invoke({ fields, resumeData })
  const response = await model.invoke(messages)
  return parser.invoke(response)
}

export async function mapFieldsWithAI(
  fields: FieldDescriptor[],
  resumeData: Record<string, unknown>,
): Promise<FieldMappingResult> {
  const output = (await invokeChain(
    JSON.stringify(fields, null, 2),
    JSON.stringify(resumeData, null, 2),
  )) as { mappings?: unknown[] } | unknown[]

  const raw = Array.isArray(output) ? output : ((output as { mappings?: unknown[] }).mappings ?? [])
  return MappingSchema.parse(raw)
}
