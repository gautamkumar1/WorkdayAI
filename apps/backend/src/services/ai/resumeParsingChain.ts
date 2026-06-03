import { getOpenAIClient } from './openaiClient'
import { z } from 'zod'

const ResumeSchema = z.object({
  name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  location: z.string().nullable(),
  summary: z.string().nullable(),
  experience: z.array(z.record(z.string(), z.unknown())),
  education: z.array(z.record(z.string(), z.unknown())),
  skills: z.array(z.string()),
  certifications: z.array(z.string()),
  links: z.record(z.string(), z.string()),
})

export type ParsedResume = z.infer<typeof ResumeSchema>

const SYSTEM_PROMPT = `You are a resume parser. Extract structured data from resume text and return ONLY valid JSON matching this schema:
{
  "name": string | null,
  "email": string | null,
  "phone": string | null,
  "location": string | null,
  "summary": string | null,
  "experience": [{"title": string, "company": string, "startDate": string, "endDate": string|null, "description": string}],
  "education": [{"degree": string, "institution": string, "graduationYear": string|null}],
  "skills": string[],
  "certifications": string[],
  "links": {"linkedin"?: string, "github"?: string, "portfolio"?: string}
}
Return null for missing fields. Never include explanation text.`

export async function parseResumeWithAI(rawText: string): Promise<ParsedResume> {
  const client = getOpenAIClient()

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Resume text:\n${rawText}` },
        ],
      })
      const json = JSON.parse(response.choices[0]?.message?.content ?? '{}')
      return ResumeSchema.parse(json)
    } catch {
      if (attempt === 2) throw new Error('Failed to parse resume after 3 attempts')
    }
  }

  throw new Error('Unreachable')
}
