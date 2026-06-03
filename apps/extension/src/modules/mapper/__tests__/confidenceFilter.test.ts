import { describe, it, expect } from 'vitest'
import { splitByConfidence } from '../confidenceFilter'
import type { FieldMapping } from '@workday-ai/shared'

function makeMapping(overrides: Partial<FieldMapping> & { confidence: number }): FieldMapping {
  return {
    fieldLabel: 'Test Field',
    fieldType: 'text',
    value: 'test',
    reasoning: 'test reasoning',
    source: 'ai_generated',
    needsReview: false,
    ...overrides,
  }
}

describe('splitByConfidence', () => {
  it('routes fields with confidence >= 0.6 to autoFill', () => {
    const mappings = [makeMapping({ confidence: 0.6 }), makeMapping({ confidence: 0.9 })]
    const { autoFill, needsReview } = splitByConfidence(mappings)
    expect(autoFill).toHaveLength(2)
    expect(needsReview).toHaveLength(0)
  })

  it('routes fields with confidence < 0.6 to needsReview', () => {
    const mappings = [makeMapping({ confidence: 0.59 }), makeMapping({ confidence: 0.0 })]
    const { autoFill, needsReview } = splitByConfidence(mappings)
    expect(autoFill).toHaveLength(0)
    expect(needsReview).toHaveLength(2)
  })

  it('routes fields with needsReview=true to needsReview regardless of confidence', () => {
    const mappings = [makeMapping({ confidence: 0.95, needsReview: true })]
    const { autoFill, needsReview } = splitByConfidence(mappings)
    expect(autoFill).toHaveLength(0)
    expect(needsReview).toHaveLength(1)
  })

  it('returns empty arrays for empty input', () => {
    const { autoFill, needsReview } = splitByConfidence([])
    expect(autoFill).toHaveLength(0)
    expect(needsReview).toHaveLength(0)
  })
})
