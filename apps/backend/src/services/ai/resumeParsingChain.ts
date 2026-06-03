import { ChatOpenAI } from '@langchain/openai'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'
import { z } from 'zod'
import { getDefaultModel, getMaxTokens } from './openaiClient'

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

const SYSTEM_PROMPT = `You are a resume parser. Extract structured data from resume text.
Return ONLY valid JSON matching this schema exactly:
{{
  "name": string | null,
  "email": string | null,
  "phone": string | null,
  "location": string | null,
  "summary": string | null,
  "experience": [{{"title": string, "company": string, "startDate": string, "endDate": string|null, "description": string}}],
  "education": [{{"degree": string, "institution": string, "graduationYear": string|null}}],
  "skills": string[],
  "certifications": string[],
  "links": {{"linkedin"?: string, "github"?: string, "portfolio"?: string}}
}}
Return null for missing fields. Return empty arrays when no items found. Never include explanation text outside the JSON.`

const parser = new JsonOutputParser()

async function invokeChain(rawText: string): Promise<unknown> {
  const model = new ChatOpenAI({
    model: getDefaultModel(),
    temperature: 0,
    maxTokens: getMaxTokens(),
  })
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', SYSTEM_PROMPT],
    ['human', 'Resume text:\n{rawText}'],
  ])
  const messages = await prompt.invoke({ rawText })
  const response = await model.invoke(messages)
  return parser.invoke(response)
}

export async function parseResumeWithAI(rawText: string): Promise<ParsedResume> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const output = await invokeChain(rawText)
      return ResumeSchema.parse(output)
    } catch {
      if (attempt === 2) throw new Error('Failed to parse resume after 3 attempts')
    }
  }
  throw new Error('Unreachable')
}
