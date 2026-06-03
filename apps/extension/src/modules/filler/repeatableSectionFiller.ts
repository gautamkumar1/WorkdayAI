import type { FieldMapping, FillResult } from '@workday-ai/shared'
import { fillTextField } from './textFiller.js'
import { fillDropdown } from './dropdownFiller.js'
import { fillDateField } from './dateFiller.js'
import { fillCheckbox } from './checkboxFiller.js'

export interface RepeatableSection {
  addButtonSelector: string
  fields: FieldMapping[]
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function findAddButton(): HTMLElement | null {
  // Search by text content
  const candidates = document.querySelectorAll<HTMLElement>('button, [role="button"]')
  for (const el of candidates) {
    const text = el.textContent?.trim().toLowerCase() ?? ''
    const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() ?? ''
    if (text === 'add another' || text === 'add' || ariaLabel.includes('add')) {
      return el
    }
  }
  return null
}

async function fillSingleField(mapping: FieldMapping): Promise<FillResult> {
  const result: FillResult = { fieldLabel: mapping.fieldLabel, status: 'failed', error: null, attempts: 1 }

  const el =
    document.querySelector<HTMLElement>(`[data-automation-id="${mapping.fieldLabel}"]`) ??
    document.querySelector<HTMLElement>(`[aria-label="${mapping.fieldLabel}"]`)

  if (!el) {
    result.error = 'Element not found'
    return result
  }

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
      case 'checkbox':
        await fillCheckbox(el as HTMLInputElement, mapping.value === 'true')
        break
      default:
        result.status = 'skipped'
        return result
    }
    result.status = 'success'
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err)
  }

  return result
}

export async function fillRepeatableSection(sections: RepeatableSection[]): Promise<FillResult[]> {
  const results: FillResult[] = []

  for (const section of sections) {
    const addButton =
      document.querySelector<HTMLElement>(section.addButtonSelector) ?? findAddButton()

    if (addButton) {
      addButton.click()
      await wait(300)
    }

    for (const field of section.fields) {
      results.push(await fillSingleField(field))
    }
  }

  return results
}
