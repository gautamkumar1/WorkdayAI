import { getOpenAIClient } from './openaiClient'
import { z } from 'zod'

export interface FieldDescriptor {
  label: string
  type: string
  options?: string[]
}

const MappingSchema = z.array(
  z.object({
    fieldLabel: z.string(),
    value: z.string(),
    confidence: z.number().min(0).max(1),
    reasoning: z.string(),
  })
)

export type FieldMappingResult = z.infer<typeof MappingSchema>

const SYSTEM_PROMPT = `You are a form-filling assistant. Map Workday form fields to resume data.
For each field, return a JSON array with objects: {fieldLabel, value, confidence (0-1), reasoning}.
- confidence >= 0.8: high confidence direct match
- confidence 0.6-0.8: inferred match
- confidence < 0.6: uncertain, needs user review
For dropdown fields, value must be one of the provided options.
Return ONLY the JSON array, no explanation.`

export async function mapFieldsWithAI(
  fields: FieldDescriptor[],
  resumeData: Record<string, unknown>
): Promise<FieldMappingResult> {
  const client = getOpenAIClient()

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT + '\nWrap your array in {"mappings": [...]}' },
      {
        role: 'user',
        content: `Form fields: ${JSON.stringify(fields)}\n\nResume data: ${JSON.stringify(resumeData)}\n\nMap each field.`,
      },
    ],
  })

  const parsed = JSON.parse(response.choices[0]?.message?.content ?? '{"mappings":[]}')
  return MappingSchema.parse(parsed.mappings ?? parsed)
}
