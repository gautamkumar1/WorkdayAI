import { parseResumeWithAI, type ParsedResume } from './resumeParsingChain'
import { mapFieldsWithAI, type FieldDescriptor, type FieldMappingResult } from './fieldMappingChain'
import { generateAnswerWithAI, type GeneratedAnswer } from './answerGenerationChain'

export interface OrchestratorInput {
  rawResumeText: string
  formFields: FieldDescriptor[]
  customQuestions?: string[]
}

export interface FillPlan {
  parsedResume: ParsedResume
  fieldMappings: FieldMappingResult
  generatedAnswers: Record<string, GeneratedAnswer>
  needsReview: FieldMappingResult
}

export async function buildFillPlan(input: OrchestratorInput): Promise<FillPlan> {
  const parsedResume = await parseResumeWithAI(input.rawResumeText)

  const fieldMappings = await mapFieldsWithAI(
    input.formFields,
    parsedResume as unknown as Record<string, unknown>,
  )

  const generatedAnswers: Record<string, GeneratedAnswer> = {}
  for (const question of input.customQuestions ?? []) {
    generatedAnswers[question] = await generateAnswerWithAI(
      question,
      parsedResume as unknown as Record<string, unknown>,
    )
  }

  const needsReview = fieldMappings.filter((m) => m.confidence < 0.6)

  return { parsedResume, fieldMappings, generatedAnswers, needsReview }
}
