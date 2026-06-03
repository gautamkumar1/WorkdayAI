import { describe, it, expect, beforeEach } from 'vitest'
import { useResumeStore } from '../resumeStore'

beforeEach(() => {
  useResumeStore.setState({
    file: null,
    rawText: null,
    parsedData: null,
    parseStatus: 'idle',
    parseError: null,
  })
})

describe('resumeStore', () => {
  it('starts in idle state', () => {
    const state = useResumeStore.getState()
    expect(state.parseStatus).toBe('idle')
    expect(state.file).toBeNull()
  })

  it('setFile transitions to parsing', () => {
    const file = new File(['content'], 'resume.pdf', { type: 'application/pdf' })
    useResumeStore.getState().setFile(file)
    const state = useResumeStore.getState()
    expect(state.parseStatus).toBe('parsing')
    expect(state.file).toBe(file)
    expect(state.parseError).toBeNull()
  })

  it('setParsed transitions to done with data', () => {
    const parsed = { name: 'John Doe', email: 'john@example.com' } as any
    useResumeStore.getState().setParsed('raw text here', parsed)
    const state = useResumeStore.getState()
    expect(state.parseStatus).toBe('done')
    expect(state.rawText).toBe('raw text here')
    expect(state.parsedData).toEqual(parsed)
    expect(state.parseError).toBeNull()
  })

  it('setParseError transitions to error state', () => {
    useResumeStore.getState().setParseError('Failed to parse PDF')
    const state = useResumeStore.getState()
    expect(state.parseStatus).toBe('error')
    expect(state.parseError).toBe('Failed to parse PDF')
  })

  it('clearResume resets all fields to initial state', () => {
    const file = new File(['x'], 'r.pdf')
    useResumeStore.getState().setFile(file)
    useResumeStore.getState().clearResume()
    const state = useResumeStore.getState()
    expect(state.file).toBeNull()
    expect(state.rawText).toBeNull()
    expect(state.parsedData).toBeNull()
    expect(state.parseStatus).toBe('idle')
    expect(state.parseError).toBeNull()
  })
})
