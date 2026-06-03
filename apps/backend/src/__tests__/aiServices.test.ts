/**
 * Unit tests for AI service chains.
 * All LangChain/OpenAI calls are mocked — no network traffic.
 */

// ─── Fixtures ────────────────────────────────────────────────────────────────

const validParsedResume = {
  name: 'Jane Smith',
  email: 'jane@example.com',
  phone: '555-9876',
  location: 'Seattle, WA',
  summary: 'Senior software engineer.',
  experience: [
    {
      title: 'Engineer',
      company: 'ACME',
      startDate: '2020-01',
      endDate: null,
      description: 'Built things',
    },
  ],
  education: [{ degree: 'B.S. CS', institution: 'UW', graduationYear: '2019' }],
  skills: ['TypeScript', 'Node.js'],
  certifications: ['AWS Solutions Architect'],
  links: { linkedin: 'https://linkedin.com/in/janesmith' },
}

// Mock model.invoke to return a fake AIMessage, and parser.invoke to return the object directly.
// We intercept at the invokeChain level: model.invoke returns a fake message,
// then JsonOutputParser.invoke receives it and returns our fixture.

const mockModelInvoke = jest.fn()
const mockParserInvoke = jest.fn()
const mockPromptInvoke = jest.fn()

jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({ invoke: mockModelInvoke })),
}))

jest.mock('@langchain/core/prompts', () => ({
  ChatPromptTemplate: {
    fromMessages: jest.fn().mockReturnValue({ invoke: mockPromptInvoke }),
  },
}))

jest.mock('@langchain/core/output_parsers', () => ({
  JsonOutputParser: jest.fn().mockImplementation(() => ({ invoke: mockParserInvoke })),
}))

// Import after mocks are set up
import { parseResumeWithAI } from '../services/ai/resumeParsingChain'
import { mapFieldsWithAI } from '../services/ai/fieldMappingChain'
import { generateAnswerWithAI } from '../services/ai/answerGenerationChain'
import { buildFillPlan } from '../services/ai/applicationOrchestrator'

// mockPromptInvoke returns a fake messages object; mockModelInvoke returns a fake AI response
// mockParserInvoke returns the actual fixture we want

function setupMocks(parserOutput: unknown) {
  mockPromptInvoke.mockResolvedValue({ messages: [] })
  mockModelInvoke.mockResolvedValue({ content: '{}' })
  mockParserInvoke.mockResolvedValue(parserOutput)
}

// ─── resumeParsingChain ───────────────────────────────────────────────────────

describe('parseResumeWithAI', () => {
  beforeEach(() => {
    mockModelInvoke.mockReset()
    mockParserInvoke.mockReset()
    mockPromptInvoke.mockReset()
    setupMocks(validParsedResume)
  })

  it('returns structured parsed resume on valid text', async () => {
    const result = await parseResumeWithAI('Jane Smith\njane@example.com\nSenior engineer')
    expect(result.name).toBe('Jane Smith')
    expect(result.email).toBe('jane@example.com')
    expect(Array.isArray(result.skills)).toBe(true)
  })

  it('handles nulls in optional fields', async () => {
    setupMocks({ ...validParsedResume, phone: null, summary: null, certifications: [], links: {} })
    const result = await parseResumeWithAI('Minimal resume text')
    expect(result.phone).toBeNull()
    expect(result.summary).toBeNull()
    expect(result.certifications).toHaveLength(0)
  })

  it('retries up to 3 times on failure then throws', async () => {
    mockPromptInvoke.mockRejectedValue(new Error('OpenAI timeout'))
    await expect(parseResumeWithAI('bad input')).rejects.toThrow(
      'Failed to parse resume after 3 attempts',
    )
    expect(mockPromptInvoke).toHaveBeenCalledTimes(3)
  })

  it('succeeds on second attempt after first failure', async () => {
    mockPromptInvoke
      .mockRejectedValueOnce(new Error('transient error'))
      .mockResolvedValue({ messages: [] })
    const result = await parseResumeWithAI('Jane Smith resume')
    expect(result.name).toBe('Jane Smith')
  })
})

// ─── fieldMappingChain ────────────────────────────────────────────────────────

describe('mapFieldsWithAI', () => {
  const highConfMappings = [
    { fieldLabel: 'First Name', value: 'Jane', confidence: 0.98, reasoning: 'Direct name match' },
    {
      fieldLabel: 'Email Address',
      value: 'jane@example.com',
      confidence: 0.99,
      reasoning: 'Direct email match',
    },
  ]

  beforeEach(() => {
    mockModelInvoke.mockReset()
    mockParserInvoke.mockReset()
    mockPromptInvoke.mockReset()
    setupMocks({ mappings: highConfMappings })
  })

  it('returns mapped fields for standard form fields', async () => {
    const fields = [
      { label: 'First Name', type: 'text' },
      { label: 'Email Address', type: 'text' },
    ]
    const result = await mapFieldsWithAI(fields, { name: 'Jane Smith', email: 'jane@example.com' })
    expect(result).toHaveLength(2)
    expect(result[0]!.fieldLabel).toBe('First Name')
    expect(result[0]!.confidence).toBeGreaterThanOrEqual(0.8)
  })

  it('flags low-confidence fields below 0.6', async () => {
    setupMocks({
      mappings: [
        ...highConfMappings,
        {
          fieldLabel: 'Years of Gap',
          value: '',
          confidence: 0.3,
          reasoning: 'Cannot determine from resume',
        },
      ],
    })
    const fields = [
      { label: 'First Name', type: 'text' },
      { label: 'Email Address', type: 'text' },
      { label: 'Years of Gap', type: 'text' },
    ]
    const result = await mapFieldsWithAI(fields, {})
    const lowConf = result.filter((m) => m.confidence < 0.6)
    expect(lowConf).toHaveLength(1)
    expect(lowConf[0]!.fieldLabel).toBe('Years of Gap')
  })

  it('handles unusual field labels via semantic inference', async () => {
    setupMocks({
      mappings: [
        {
          fieldLabel: 'Given Name',
          value: 'Jane',
          confidence: 0.72,
          reasoning: 'Inferred as first name',
        },
      ],
    })
    const result = await mapFieldsWithAI([{ label: 'Given Name', type: 'text' }], {
      name: 'Jane Smith',
    })
    expect(result[0]!.value).toBe('Jane')
    expect(result[0]!.confidence).toBeGreaterThan(0.6)
  })

  it('handles dropdown fields by returning one of the provided options', async () => {
    setupMocks({
      mappings: [
        {
          fieldLabel: 'Country',
          value: 'United States',
          confidence: 0.91,
          reasoning: 'Matched location country',
        },
      ],
    })
    const result = await mapFieldsWithAI(
      [{ label: 'Country', type: 'dropdown', options: ['United States', 'Canada', 'Other'] }],
      { location: 'Seattle, WA, United States' },
    )
    expect(result[0]!.value).toBe('United States')
  })

  it('handles missing resume data with zero-confidence placeholders', async () => {
    setupMocks({
      mappings: [
        {
          fieldLabel: 'Security Clearance Level',
          value: '',
          confidence: 0.0,
          reasoning: 'Not found',
        },
      ],
    })
    const result = await mapFieldsWithAI(
      [{ label: 'Security Clearance Level', type: 'dropdown' }],
      {},
    )
    expect(result[0]!.confidence).toBe(0)
    expect(result[0]!.value).toBe('')
  })

  it('accepts flat array response (no wrapper object) from model', async () => {
    setupMocks(highConfMappings)
    const result = await mapFieldsWithAI([{ label: 'First Name', type: 'text' }], {})
    expect(Array.isArray(result)).toBe(true)
  })
})

// ─── answerGenerationChain ────────────────────────────────────────────────────

describe('generateAnswerWithAI', () => {
  const baseAnswer = {
    answer: 'Yes, I am authorized to work in the US.',
    confidence: 0.85,
    fallback: 'Please confirm your work authorization status.',
    needsReview: false,
  }

  beforeEach(() => {
    mockModelInvoke.mockReset()
    mockParserInvoke.mockReset()
    mockPromptInvoke.mockReset()
    setupMocks(baseAnswer)
  })

  it('returns answer with confidence for a normal question', async () => {
    const result = await generateAnswerWithAI('Why do you want to join us?', { name: 'Jane' })
    expect(result.answer).toBeDefined()
    expect(typeof result.confidence).toBe('number')
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
  })

  it('forces needsReview=true for salary questions regardless of model output', async () => {
    setupMocks({ ...baseAnswer, needsReview: false })
    const result = await generateAnswerWithAI('What are your salary expectations?', {})
    expect(result.needsReview).toBe(true)
  })

  it('forces needsReview=true for visa/sponsorship questions', async () => {
    setupMocks({ ...baseAnswer, needsReview: false })
    const result = await generateAnswerWithAI('Do you require visa sponsorship?', {})
    expect(result.needsReview).toBe(true)
  })

  it('forces needsReview=true for security clearance questions', async () => {
    setupMocks({ ...baseAnswer, needsReview: false })
    const result = await generateAnswerWithAI('Do you hold a security clearance?', {})
    expect(result.needsReview).toBe(true)
  })

  it('does not force needsReview for non-sensitive questions', async () => {
    setupMocks({ ...baseAnswer, needsReview: false })
    const result = await generateAnswerWithAI('Describe your greatest strength.', {})
    expect(result.needsReview).toBe(false)
  })

  it('includes fallback suggestion when confidence is low', async () => {
    setupMocks({ ...baseAnswer, confidence: 0.5, fallback: 'Please provide your answer manually.' })
    const result = await generateAnswerWithAI('What is your expected start date?', {})
    expect(result.fallback).toBeTruthy()
  })
})

// ─── applicationOrchestrator ─────────────────────────────────────────────────

describe('buildFillPlan', () => {
  const highConfMappings = [
    { fieldLabel: 'First Name', value: 'Jane', confidence: 0.98, reasoning: 'Direct match' },
    { fieldLabel: 'Work Auth', value: '', confidence: 0.3, reasoning: 'Unclear' },
  ]

  const answerFixture = {
    answer: 'Yes',
    confidence: 0.9,
    fallback: 'Please confirm',
    needsReview: true,
  }

  beforeEach(() => {
    mockModelInvoke.mockReset()
    mockParserInvoke.mockReset()
    mockPromptInvoke.mockReset()
    mockPromptInvoke.mockResolvedValue({ messages: [] })
    mockModelInvoke.mockResolvedValue({ content: '{}' })
  })

  it('returns a complete fill plan with parsed resume, mappings, answers, and needsReview', async () => {
    mockParserInvoke
      .mockResolvedValueOnce(validParsedResume) // parseResumeWithAI
      .mockResolvedValueOnce({ mappings: highConfMappings }) // mapFieldsWithAI
      .mockResolvedValueOnce(answerFixture) // generateAnswerWithAI

    const plan = await buildFillPlan({
      rawResumeText: 'Jane Smith resume...',
      formFields: [
        { label: 'First Name', type: 'text' },
        { label: 'Work Auth', type: 'dropdown', options: ['Yes', 'No'] },
      ],
      customQuestions: ['Are you authorized to work in the US?'],
    })

    expect(plan.parsedResume.name).toBe('Jane Smith')
    expect(plan.fieldMappings).toHaveLength(2)
    expect(plan.needsReview).toHaveLength(1)
    expect(plan.needsReview[0]!.fieldLabel).toBe('Work Auth')
    expect(Object.keys(plan.generatedAnswers)).toHaveLength(1)
  })

  it('returns empty needsReview when all mappings are high-confidence', async () => {
    const allHighConf = [
      { fieldLabel: 'First Name', value: 'Jane', confidence: 0.98, reasoning: 'Direct' },
      { fieldLabel: 'Email', value: 'jane@ex.com', confidence: 0.99, reasoning: 'Direct' },
    ]
    mockParserInvoke
      .mockResolvedValueOnce(validParsedResume)
      .mockResolvedValueOnce({ mappings: allHighConf })

    const plan = await buildFillPlan({
      rawResumeText: 'Jane Smith resume...',
      formFields: [
        { label: 'First Name', type: 'text' },
        { label: 'Email', type: 'text' },
      ],
    })

    expect(plan.needsReview).toHaveLength(0)
    expect(plan.generatedAnswers).toEqual({})
  })
})
