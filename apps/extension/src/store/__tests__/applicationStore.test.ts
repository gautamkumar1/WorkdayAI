import { describe, it, expect, beforeEach } from 'vitest'
import { useApplicationStore } from '../applicationStore'
import type { FillPlan, FillResult, FieldMapping } from '@workday-ai/shared'

function makeField(overrides: Partial<FieldMapping> = {}): FieldMapping {
  return {
    fieldLabel: 'First Name',
    fieldType: 'text',
    value: 'Alice',
    confidence: 0.95,
    reasoning: 'direct match',
    source: 'ai_generated',
    needsReview: false,
    ...overrides,
  }
}

function makeFillPlan(fields: FieldMapping[] = []): FillPlan {
  return { applicationId: 'app-1', fields, lowConfidenceCount: 0 }
}

beforeEach(() => {
  useApplicationStore.getState().reset()
})

describe('applicationStore', () => {
  it('starts with empty state', () => {
    const state = useApplicationStore.getState()
    expect(state.applicationId).toBeNull()
    expect(state.currentStep).toBe('unknown')
    expect(state.fillResults).toHaveLength(0)
  })

  it('startFill sets applicationId, jobUrl, and filters low-confidence fields', () => {
    const plan = makeFillPlan([
      makeField({ fieldLabel: 'First Name', confidence: 0.95, needsReview: false }),
      makeField({ fieldLabel: 'Custom Question', confidence: 0.4, needsReview: true }),
    ])
    useApplicationStore.getState().startFill('app-123', 'https://wd.com/apply', plan)
    const state = useApplicationStore.getState()
    expect(state.applicationId).toBe('app-123')
    expect(state.jobUrl).toBe('https://wd.com/apply')
    expect(state.currentStep).toBe('my_information')
    expect(state.lowConfidenceFields).toHaveLength(1)
    expect(state.lowConfidenceFields[0]!.fieldLabel).toBe('Custom Question')
  })

  it('updateFillResult appends new result', () => {
    const result: FillResult = { fieldLabel: 'Email', status: 'success', error: null, attempts: 1 }
    useApplicationStore.getState().updateFillResult(result)
    expect(useApplicationStore.getState().fillResults).toHaveLength(1)
    expect(useApplicationStore.getState().fillResults[0]).toEqual(result)
  })

  it('updateFillResult replaces existing result for same field', () => {
    const first: FillResult = { fieldLabel: 'Phone', status: 'pending', error: null, attempts: 1 }
    const second: FillResult = { fieldLabel: 'Phone', status: 'success', error: null, attempts: 2 }
    useApplicationStore.getState().updateFillResult(first)
    useApplicationStore.getState().updateFillResult(second)
    const results = useApplicationStore.getState().fillResults
    expect(results).toHaveLength(1)
    expect(results[0]!.status).toBe('success')
  })

  it('setStep changes currentStep', () => {
    useApplicationStore.getState().setStep('experience')
    expect(useApplicationStore.getState().currentStep).toBe('experience')
  })

  it('confirmSubmit sets step to submit', () => {
    useApplicationStore.getState().confirmSubmit()
    expect(useApplicationStore.getState().currentStep).toBe('submit')
  })

  it('reset clears all state', () => {
    const plan = makeFillPlan([makeField({ fieldLabel: 'Name' })])
    useApplicationStore.getState().startFill('app-1', 'https://wd.com', plan)
    useApplicationStore.getState().reset()
    const state = useApplicationStore.getState()
    expect(state.applicationId).toBeNull()
    expect(state.fillResults).toHaveLength(0)
    expect(state.currentStep).toBe('unknown')
  })
})
