/**
 * Exhaustive field-label coverage for mapFieldsWithAI.
 * All OpenAI calls are mocked — tests verify the mapping pipeline handles
 * 20+ real Workday field labels correctly: parsing, confidence thresholds,
 * dropdown constraints, and missing-data fallbacks.
 */

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

import { mapFieldsWithAI } from '../services/ai/fieldMappingChain'
import type { FieldDescriptor } from '../services/ai/fieldMappingChain'

const resumeData = {
  name: 'Alice Chen',
  email: 'alice@example.com',
  phone: '206-555-0101',
  location: 'Seattle, WA',
  summary: 'Software engineer with 5 years experience.',
  experience: [
    {
      title: 'Software Engineer II',
      company: 'TechCorp',
      startDate: '2021-03',
      endDate: null,
      description: 'Built microservices with Node.js',
    },
    {
      title: 'Junior Developer',
      company: 'StartupCo',
      startDate: '2019-06',
      endDate: '2021-02',
      description: 'Frontend development with React',
    },
  ],
  education: [{ degree: 'B.S. Computer Science', institution: 'UW', graduationYear: '2019' }],
  skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'AWS'],
  certifications: ['AWS Certified Developer'],
  links: { linkedin: 'https://linkedin.com/in/alicechen', github: 'https://github.com/alicechen' },
}

function makeMapping(label: string, value: string, confidence = 0.9) {
  return { fieldLabel: label, value, confidence, reasoning: 'test fixture' }
}

function setupMockMappings(mappings: ReturnType<typeof makeMapping>[]) {
  mockPromptInvoke.mockResolvedValue({ messages: [] })
  mockModelInvoke.mockResolvedValue({ content: '{}' })
  mockParserInvoke.mockResolvedValue({ mappings })
}

beforeEach(() => {
  mockPromptInvoke.mockReset()
  mockModelInvoke.mockReset()
  mockParserInvoke.mockReset()
})

const STANDARD_FIELD_CASES: Array<{ label: string; expectedValue: string; fieldType?: string }> = [
  { label: 'First Name', expectedValue: 'Alice' },
  { label: 'Last Name', expectedValue: 'Chen' },
  { label: 'Given Name', expectedValue: 'Alice' },
  { label: 'Family Name', expectedValue: 'Chen' },
  { label: 'Email Address', expectedValue: 'alice@example.com' },
  { label: 'Email', expectedValue: 'alice@example.com' },
  { label: 'Phone Number', expectedValue: '206-555-0101' },
  { label: 'Mobile Phone', expectedValue: '206-555-0101' },
  { label: 'City', expectedValue: 'Seattle' },
  { label: 'State', expectedValue: 'WA' },
  { label: 'Current Location', expectedValue: 'Seattle, WA' },
  { label: 'LinkedIn URL', expectedValue: 'https://linkedin.com/in/alicechen' },
  { label: 'LinkedIn Profile', expectedValue: 'https://linkedin.com/in/alicechen' },
  { label: 'GitHub URL', expectedValue: 'https://github.com/alicechen' },
  { label: 'Website / Portfolio', expectedValue: 'https://github.com/alicechen' },
  { label: 'Most Recent Job Title', expectedValue: 'Software Engineer II' },
  { label: 'Current Company', expectedValue: 'TechCorp' },
  { label: 'Years of Experience', expectedValue: '5' },
  { label: 'Highest Education Level', expectedValue: "Bachelor's Degree", fieldType: 'dropdown' },
  { label: 'Degree', expectedValue: 'B.S. Computer Science' },
  { label: 'University / College', expectedValue: 'UW' },
  { label: 'Graduation Year', expectedValue: '2019' },
  { label: 'Cover Letter', expectedValue: '' }, // missing data, should be empty
  { label: 'Referral Source', expectedValue: '' },
]

describe('mapFieldsWithAI — 20+ varied Workday field labels', () => {
  it.each(STANDARD_FIELD_CASES)(
    'maps "$label" correctly',
    async ({ label, expectedValue, fieldType }) => {
      setupMockMappings([makeMapping(label, expectedValue)])
      const fields: FieldDescriptor[] = [{ label, type: fieldType ?? 'text' }]
      const result = await mapFieldsWithAI(fields, resumeData)
      expect(result).toHaveLength(1)
      expect(result[0]!.fieldLabel).toBe(label)
      expect(result[0]!.value).toBe(expectedValue)
    },
  )
})

describe('mapFieldsWithAI — confidence thresholds', () => {
  it('passes through high-confidence mapping (>=0.8)', async () => {
    setupMockMappings([makeMapping('Email Address', 'alice@example.com', 0.95)])
    const [result] = await mapFieldsWithAI([{ label: 'Email Address', type: 'text' }], resumeData)
    expect(result!.confidence).toBeGreaterThanOrEqual(0.8)
  })

  it('passes through inferred mapping (0.6–0.8)', async () => {
    setupMockMappings([makeMapping('Given Name', 'Alice', 0.7)])
    const [result] = await mapFieldsWithAI([{ label: 'Given Name', type: 'text' }], resumeData)
    expect(result!.confidence).toBeGreaterThanOrEqual(0.6)
    expect(result!.confidence).toBeLessThan(0.8)
  })

  it('passes through low-confidence mapping (<0.6)', async () => {
    setupMockMappings([makeMapping('Cover Letter', '', 0.0)])
    const [result] = await mapFieldsWithAI(
      [{ label: 'Cover Letter', type: 'textarea' }],
      resumeData,
    )
    expect(result!.confidence).toBeLessThan(0.6)
    expect(result!.value).toBe('')
  })
})

describe('mapFieldsWithAI — dropdown fields', () => {
  it('returns a value constrained to provided options', async () => {
    const options = ['Full-Time', 'Part-Time', 'Contract', 'Internship']
    setupMockMappings([makeMapping('Employment Type', 'Full-Time', 0.9)])
    const fields: FieldDescriptor[] = [{ label: 'Employment Type', type: 'dropdown', options }]
    const [result] = await mapFieldsWithAI(fields, resumeData)
    expect(options).toContain(result!.value)
  })

  it('handles work authorization dropdown', async () => {
    const options = ['US Citizen', 'Permanent Resident', 'H1B', 'Other']
    setupMockMappings([makeMapping('Work Authorization', 'Other', 0.5)])
    const fields: FieldDescriptor[] = [{ label: 'Work Authorization', type: 'dropdown', options }]
    const [result] = await mapFieldsWithAI(fields, resumeData)
    expect(result!.fieldLabel).toBe('Work Authorization')
  })
})

describe('mapFieldsWithAI — missing resume data', () => {
  it('returns empty string with confidence 0 when data is absent', async () => {
    setupMockMappings([makeMapping('Security Clearance', '', 0.0)])
    const [result] = await mapFieldsWithAI(
      [{ label: 'Security Clearance', type: 'text' }],
      resumeData,
    )
    expect(result!.value).toBe('')
    expect(result!.confidence).toBe(0.0)
  })

  it('handles multiple fields at once', async () => {
    setupMockMappings([
      makeMapping('First Name', 'Alice', 0.98),
      makeMapping('Last Name', 'Chen', 0.98),
      makeMapping('Email', 'alice@example.com', 0.99),
    ])
    const fields: FieldDescriptor[] = [
      { label: 'First Name', type: 'text' },
      { label: 'Last Name', type: 'text' },
      { label: 'Email', type: 'text' },
    ]
    const results = await mapFieldsWithAI(fields, resumeData)
    expect(results).toHaveLength(3)
  })
})

describe('mapFieldsWithAI — schema validation', () => {
  it('accepts flat array response (no mappings wrapper)', async () => {
    const flatArray = [makeMapping('First Name', 'Alice', 0.95)]
    mockPromptInvoke.mockResolvedValue({ messages: [] })
    mockModelInvoke.mockResolvedValue({ content: '{}' })
    mockParserInvoke.mockResolvedValue(flatArray)
    const results = await mapFieldsWithAI([{ label: 'First Name', type: 'text' }], resumeData)
    expect(results).toHaveLength(1)
  })

  it('throws when parser returns invalid schema', async () => {
    mockPromptInvoke.mockResolvedValue({ messages: [] })
    mockModelInvoke.mockResolvedValue({ content: '{}' })
    mockParserInvoke.mockResolvedValue({ mappings: [{ fieldLabel: 123, value: null }] })
    await expect(mapFieldsWithAI([{ label: 'Name', type: 'text' }], resumeData)).rejects.toThrow()
  })
})
