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
- For dropdown fields WITH options: value MUST be one of the provided options exactly
- For dropdown fields WITHOUT options (empty array): use the best value from resume data directly
- For missing data, return value="" with confidence=0.0
- "Country" field with no options → use country name from resume location (e.g. "India", "United States")
- Wrap the array in {{"mappings": [...]}}
- Return ONLY the JSON object, no explanation text

Smart defaults (use when data is absent but answer is logically inferable):
- "Have you previously worked for [Company]?" → default "No" with confidence=0.75 unless resume shows that company in experience
- "Are you legally authorized to work?" → default "Yes" with confidence=0.7
- "Will you now or in future require sponsorship?" → default "No" with confidence=0.65
- "Local Given Name(s)" / "Local Family Name" → use same value as Given Name / Family Name with confidence=0.85
- "Given Name(s)" → map to firstName from resume name with confidence=0.95
- "Family Name" → map to lastName from resume name with confidence=0.95
- "I have a preferred name" → default value="false" (checkbox unchecked) with confidence=0.9
- "Country" field → ALWAYS return "India" with confidence=0.95 (default country for this applicant)
- "Country Phone Code" → return "India (+91)" or the option containing "India" with confidence=0.95
- "Phone Device Type" → default "Home" with confidence=0.9
- "How Did You Hear About Us?" → if options are provided pick "Internet Search" or the closest match; if no options return "Internet Search" with confidence=0.8
- "Phone Extension" → default "" (empty string) with confidence=0.95 — never leave as needsReview
- "Email Address" field → use email from resume with confidence=0.99

Address parsing rules (the resume location field is a single string like "Mumbai, Maharashtra, India"):
- "City" → extract the city portion from location (first segment before comma). confidence=0.85
- "State" or "State/Region" → extract the state/province from location (middle segment). confidence=0.8
- "Address Line 1" → if a street address is in the resume use it; otherwise use the city name as a stand-in with confidence=0.6 so the user can correct it
- "Postal Code" → extract if present in location string; otherwise return "" with confidence=0.5 (flagged for review)
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
