import type { FieldMapping, FillResult } from '@workday-ai/shared'
import { fillTextField } from './textFiller.js'
import { fillDropdown } from './dropdownFiller.js'
import { fillDateField } from './dateFiller.js'
import { fillRadio } from './radioFiller.js'
import { fillCheckbox } from './checkboxFiller.js'
import {
  findFieldByAutomationId,
  findFieldByAriaLabel,
  findFieldByLabel,
} from '../dom/fieldFinder'
import { highlightField } from '../dom/fieldHighlighter'

function randomDelay(min = 150, max = 300): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function findElement(fieldLabel: string): HTMLElement | null {
  return (
    (findFieldByAutomationId(fieldLabel) as HTMLElement | null) ??
    (findFieldByAriaLabel(fieldLabel) as HTMLElement | null) ??
    (findFieldByLabel(fieldLabel) as HTMLElement | null)
  )
}

async function executeOnce(mapping: FieldMapping): Promise<void> {
  const el = findElement(mapping.fieldLabel)
  if (!el) throw new Error(`Element not found for field: ${mapping.fieldLabel}`)

  highlightField(el, 'pending')

  try {
    switch (mapping.fieldType) {
      case 'text':
      case 'textarea':
        await fillTextField(el as HTMLInputElement | HTMLTextAreaElement, mapping.value)
        break
      case 'dropdown':
        await fillDropdown(el, mapping.value)
        break
      case 'date':
        await fillDateField(el as HTMLInputElement, mapping.value)
        break
      case 'radio':
        await fillRadio(mapping.fieldLabel, mapping.value)
        break
      case 'checkbox':
        await fillCheckbox(el as HTMLInputElement, mapping.value === 'true')
        break
      case 'file':
        throw new Error('File fields must be handled separately via fillFileInput')
    }
    highlightField(el, 'success')
    el.setAttribute('data-wai-filled', 'true')
  } catch (err) {
    highlightField(el, 'error')
    throw err
  }
}

export async function executeFillPlan(
  mappings: FieldMapping[],
  delayMs?: number,
): Promise<FillResult[]> {
  const results: FillResult[] = []

  for (const mapping of mappings) {
    if (mapping.needsReview) {
      results.push({ fieldLabel: mapping.fieldLabel, status: 'skipped', error: null, attempts: 0 })
      continue
    }

    const result: FillResult = {
      fieldLabel: mapping.fieldLabel,
      status: 'pending',
      error: null,
      attempts: 0,
    }

    const maxAttempts = 3
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      result.attempts = attempt
      try {
        await executeOnce(mapping)
        result.status = 'success'
        result.error = null
        break
      } catch (err) {
        result.error = err instanceof Error ? err.message : String(err)
        if (attempt === maxAttempts) {
          result.status = 'manual_required'
        }
      }
    }

    results.push(result)
    await wait(delayMs ?? randomDelay())
  }

  return results
}
