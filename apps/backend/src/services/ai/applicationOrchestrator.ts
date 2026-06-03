import { RunnableSequence } from '@langchain/core/runnables'
import { RunnableLambda } from '@langchain/core/runnables'
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

const parseStep = RunnableLambda.from(async (input: OrchestratorInput) => {
  const parsedResume = await parseResumeWithAI(input.rawResumeText)
  return { ...input, parsedResume }
})

const mapStep = RunnableLambda.from(
  async (input: OrchestratorInput & { parsedResume: ParsedResume }) => {
    const fieldMappings = await mapFieldsWithAI(
      input.formFields,
      input.parsedResume as unknown as Record<string, unknown>
    )
    return { ...input, fieldMappings }
  }
)

const answerStep = RunnableLambda.from(
  async (input: OrchestratorInput & { parsedResume: ParsedResume; fieldMappings: FieldMappingResult }) => {
    const questions = input.customQuestions ?? []
    const answers: Record<string, GeneratedAnswer> = {}

    for (const question of questions) {
      answers[question] = await generateAnswerWithAI(
        question,
        input.parsedResume as unknown as Record<string, unknown>
      )
    }

    return { ...input, generatedAnswers: answers }
  }
)

const buildPlanStep = RunnableLambda.from(
  async (
    input: OrchestratorInput & {
      parsedResume: ParsedResume
      fieldMappings: FieldMappingResult
      generatedAnswers: Record<string, GeneratedAnswer>
    }
  ): Promise<FillPlan> => {
    const needsReview = input.fieldMappings.filter((m) => m.confidence < 0.6)
    return {
      parsedResume: input.parsedResume,
      fieldMappings: input.fieldMappings,
      generatedAnswers: input.generatedAnswers,
      needsReview,
    }
  }
)

const orchestratorChain = RunnableSequence.from([parseStep, mapStep, answerStep, buildPlanStep])

export async function buildFillPlan(input: OrchestratorInput): Promise<FillPlan> {
  return orchestratorChain.invoke(input)
}
