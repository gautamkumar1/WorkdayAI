// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FieldMapping } from '@workday-ai/shared'

vi.mock('../textFiller.js', () => ({ fillTextField: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../dropdownFiller.js', () => ({ fillDropdown: vi.fn().mockResolvedValue(true) }))
vi.mock('../dateFiller.js', () => ({ fillDateField: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../radioFiller.js', () => ({ fillRadio: vi.fn().mockResolvedValue(true) }))
vi.mock('../checkboxFiller.js', () => ({ fillCheckbox: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../../dom/fieldHighlighter', () => ({ highlightField: vi.fn() }))
vi.mock('../../dom/fieldFinder', () => ({
  findFieldByAutomationId: vi.fn(),
  findFieldByAriaLabel: vi.fn(),
  findFieldByLabel: vi.fn(),
}))

import { executeFillPlan } from '../fillOrchestrator.js'
import { fillTextField } from '../textFiller.js'
import { fillDropdown } from '../dropdownFiller.js'
import { fillRadio } from '../radioFiller.js'
import { fillCheckbox } from '../checkboxFiller.js'
import {
  findFieldByAutomationId,
  findFieldByAriaLabel,
  findFieldByLabel,
} from '../../dom/fieldFinder'

const mockFillTextField = fillTextField as ReturnType<typeof vi.fn>
const mockFillDropdown = fillDropdown as ReturnType<typeof vi.fn>
const mockFillRadio = fillRadio as ReturnType<typeof vi.fn>
const mockFillCheckbox = fillCheckbox as ReturnType<typeof vi.fn>
const mockFindByAutomation = findFieldByAutomationId as ReturnType<typeof vi.fn>
const mockFindByAria = findFieldByAriaLabel as ReturnType<typeof vi.fn>
const mockFindByLabel = findFieldByLabel as ReturnType<typeof vi.fn>

function makeMapping(overrides: Partial<FieldMapping> = {}): FieldMapping {
  return {
    fieldLabel: 'First Name',
    fieldType: 'text',
    value: 'John',
    confidence: 0.9,
    needsReview: false,
    reasoning: 'direct match',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockFindByAutomation.mockReturnValue(null)
  mockFindByAria.mockReturnValue(null)
  mockFindByLabel.mockReturnValue(null)
})

describe('executeFillPlan', () => {
  it('skips fields with needsReview=true', async () => {
    const mapping = makeMapping({ needsReview: true })
    const results = await executeFillPlan([mapping], 0)
    expect(results[0]!.status).toBe('skipped')
    expect(results[0]!.attempts).toBe(0)
    expect(mockFillTextField).not.toHaveBeenCalled()
  })

  it('marks field manual_required when element not found after 3 attempts', async () => {
    // all finders return null → element not found
    const mapping = makeMapping()
    const results = await executeFillPlan([mapping], 0)
    expect(results[0]!.status).toBe('manual_required')
    expect(results[0]!.attempts).toBe(3)
    expect(results[0]!.error).toMatch(/not found/i)
  })

  it('fills text field successfully', async () => {
    const el = document.createElement('input')
    mockFindByAutomation.mockReturnValue(el)
    const results = await executeFillPlan([makeMapping()], 0)
    expect(results[0]!.status).toBe('success')
    expect(mockFillTextField).toHaveBeenCalledWith(el, 'John')
  })

  it('fills dropdown field', async () => {
    const el = document.createElement('div')
    mockFindByAria.mockReturnValue(el)
    const mapping = makeMapping({ fieldType: 'dropdown', value: 'Full-Time' })
    const results = await executeFillPlan([mapping], 0)
    expect(results[0]!.status).toBe('success')
    expect(mockFillDropdown).toHaveBeenCalledWith(el, 'Full-Time')
  })

  it('fills radio field', async () => {
    const el = document.createElement('input')
    mockFindByLabel.mockReturnValue(el)
    const mapping = makeMapping({ fieldType: 'radio', value: 'Yes' })
    const results = await executeFillPlan([mapping], 0)
    expect(results[0]!.status).toBe('success')
    expect(mockFillRadio).toHaveBeenCalledWith('First Name', 'Yes')
  })

  it('fills checkbox field', async () => {
    const el = document.createElement('input')
    mockFindByAutomation.mockReturnValue(el)
    const mapping = makeMapping({ fieldType: 'checkbox', value: 'true' })
    const results = await executeFillPlan([mapping], 0)
    expect(results[0]!.status).toBe('success')
    expect(mockFillCheckbox).toHaveBeenCalledWith(el, true)
  })

  it('retries on failure and succeeds on second attempt', async () => {
    const el = document.createElement('input')
    mockFindByAutomation.mockReturnValue(el)
    mockFillTextField.mockRejectedValueOnce(new Error('transient')).mockResolvedValueOnce(undefined)
    const results = await executeFillPlan([makeMapping()], 0)
    expect(results[0]!.status).toBe('success')
    expect(results[0]!.attempts).toBe(2)
  })

  it('processes multiple fields in order', async () => {
    const el = document.createElement('input')
    mockFindByAutomation.mockReturnValue(el)
    const mappings = [
      makeMapping({ fieldLabel: 'First Name', value: 'John' }),
      makeMapping({ fieldLabel: 'Last Name', value: 'Doe' }),
    ]
    const results = await executeFillPlan(mappings, 0)
    expect(results).toHaveLength(2)
    expect(results.every((r) => r.status === 'success')).toBe(true)
  })

  it('marks file fields as manual_required', async () => {
    const el = document.createElement('input')
    mockFindByAutomation.mockReturnValue(el)
    const mapping = makeMapping({ fieldType: 'file', value: 'resume.pdf' })
    const results = await executeFillPlan([mapping], 0)
    expect(results[0]!.status).toBe('manual_required')
  })
})
