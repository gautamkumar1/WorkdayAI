import type { FieldMapping, FillResult } from '@workday-ai/shared'
import { fillTextField } from './textFiller.js'
import { fillDropdown } from './dropdownFiller.js'
import { fillDateField } from './dateFiller.js'
import { fillRadio } from './radioFiller.js'
import { fillCheckbox } from './checkboxFiller.js'
import { findFieldByAriaLabel, findFieldByLabel } from '../dom/fieldFinder'
import { highlightField } from '../dom/fieldHighlighter'

function randomDelay(min = 150, max = 300): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Resolve to the formField-* container div. The automationId in the mapping may point
// to either the container (formField-legalNameSection_firstName) or the inner element
// (legalNameSection_firstName). We always want the container.
function findContainer(mapping: FieldMapping): HTMLElement | null {
  // 1. Try automationId directly (may be the container or an inner element)
  if (mapping.automationId) {
    const el = document.querySelector<HTMLElement>(`[data-automation-id="${mapping.automationId}"]`)
    if (el) {
      const container = el.closest<HTMLElement>('[data-automation-id^="formField-"]')
      return container ?? el
    }

    // 2. Try with formField- prefix in case scanner stored inner ID
    const withPrefix = document.querySelector<HTMLElement>(
      `[data-automation-id="formField-${mapping.automationId}"]`,
    )
    if (withPrefix) return withPrefix

    // 3. Try without formField- prefix (inner element, then walk up)
    const withoutPrefix = mapping.automationId.startsWith('formField-')
      ? document.querySelector<HTMLElement>(
          `[data-automation-id="${mapping.automationId.replace('formField-', '')}"]`,
        )
      : null
    if (withoutPrefix) {
      const container = withoutPrefix.closest<HTMLElement>('[data-automation-id^="formField-"]')
      return container ?? withoutPrefix
    }
  }

  // 4. Label-based fallback — search label elements and Workday label divs
  const labelLower = mapping.fieldLabel.toLowerCase().replace(/\*/g, '').trim()

  // Check all formField containers for a label text match
  const allContainers = document.querySelectorAll<HTMLElement>('[data-automation-id^="formField-"]')
  for (const container of allContainers) {
    const labelEl = container.querySelector('[data-automation-id$="Label"], label')
    const text = labelEl?.textContent?.replace(/\*/g, '').trim().toLowerCase() ?? ''
    if (text === labelLower) return container
  }

  // 5. aria-label or findFieldByLabel then walk up
  const byLabel =
    (findFieldByAriaLabel(mapping.fieldLabel) as HTMLElement | null) ??
    (findFieldByLabel(mapping.fieldLabel) as HTMLElement | null)
  if (byLabel) {
    const container = byLabel.closest<HTMLElement>('[data-automation-id^="formField-"]')
    return container ?? byLabel
  }

  return null
}

async function executeOnce(mapping: FieldMapping): Promise<void> {
  const container = findContainer(mapping)
  if (!container) throw new Error(`Element not found for field: ${mapping.fieldLabel}`)

  highlightField(container, 'pending')

  try {
    switch (mapping.fieldType) {
      case 'text':
      case 'textarea': {
        // Drill to the actual input/textarea inside the container
        const inner = container.querySelector<HTMLInputElement | HTMLTextAreaElement>(
          'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]), textarea',
        )
        if (!inner) throw new Error(`No text input found in container for: ${mapping.fieldLabel}`)
        await fillTextField(inner, mapping.value)
        break
      }
      case 'dropdown':
        await fillDropdown(container, mapping.value)
        break
      case 'date': {
        const dateInput = container.querySelector<HTMLInputElement>('input[type="date"], input')
        if (!dateInput) throw new Error(`No date input found for: ${mapping.fieldLabel}`)
        await fillDateField(dateInput, mapping.value)
        break
      }
      case 'radio':
        await fillRadio(mapping.automationId ?? mapping.fieldLabel, mapping.value)
        break
      case 'checkbox': {
        const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]')
        if (checkbox) {
          await fillCheckbox(checkbox, mapping.value === 'true')
        } else {
          // Workday renders some checkboxes as div[role="checkbox"]
          const ariaBox = container.querySelector<HTMLElement>('[role="checkbox"]')
          if (!ariaBox) throw new Error(`No checkbox found for: ${mapping.fieldLabel}`)
          const isChecked = ariaBox.getAttribute('aria-checked') === 'true'
          if (isChecked !== (mapping.value === 'true')) ariaBox.click()
        }
        break
      }
      case 'file':
        throw new Error('File fields must be handled separately via fillFileInput')
    }
    highlightField(container, 'success')
    container.setAttribute('data-wai-filled', 'true')
  } catch (err) {
    highlightField(container, 'error')
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
