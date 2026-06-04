import type { FieldDescriptor } from '@workday-ai/shared'

// Workday wraps every field in a div[data-automation-id="formField-*"]
const WORKDAY_FIELD_CONTAINER = '[data-automation-id^="formField-"]'

// Skip containers that are navigation/chrome
const SKIP_AUTOMATION_IDS = new Set([
  'header',
  'headerTitle',
  'navigationContainer',
  'utilityButtonBar',
  'pageFooter',
  'footerContainer',
  'progressBar',
  'applyFlowPage',
])

function isVisible(el: Element): boolean {
  const style = window.getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false
  }
  const rect = el.getBoundingClientRect()
  // If all zeros, getBoundingClientRect has no layout info (jsdom/test env) — use offsetParent
  if (rect.width === 0 && rect.height === 0 && rect.top === 0) {
    return (el as HTMLElement).offsetParent !== null || el.parentElement !== null
  }
  return rect.width > 0 && rect.height > 0
}

function getLabelText(container: Element): string {
  // Workday label pattern: [data-automation-id$="Label"] or [data-automation-id$="-label"]
  const labelEl =
    container.querySelector<Element>('[data-automation-id$="Label"]') ??
    container.querySelector<Element>('label') ??
    container.querySelector<Element>('[data-automation-id="formLabel"]')

  if (labelEl) {
    return labelEl.textContent?.replace(/\*/g, '').trim() ?? ''
  }

  // Fallback: derive from automation ID itself
  // "formField-source" → "source", "formField-legalName--firstName" → "firstName"
  const autoId = container.getAttribute('data-automation-id') ?? ''
  const key = autoId.replace('formField-', '').replace(/.*--/, '')
  return key
}

function getFieldDescriptorFromContainer(container: Element): FieldDescriptor | null {
  const label = getLabelText(container)
  if (!label) return null

  const autoId = container.getAttribute('data-automation-id') ?? ''

  // Radio group
  const radios = container.querySelectorAll<HTMLInputElement>('input[type="radio"]')
  if (radios.length > 0) {
    // Use the radio name as the automationId for the filler
    const radioName = radios[0]?.name ?? autoId
    return {
      label,
      type: 'radio',
      automationId: radioName,
      ariaLabel: null,
      placeholder: null,
      options: Array.from(radios).map((r) => r.labels?.[0]?.textContent?.trim() ?? r.value),
      required: container.querySelector('[aria-required="true"], [required]') !== null,
      currentValue: null,
    }
  }

  // Checkbox
  const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]')
  if (checkbox) {
    return {
      label,
      type: 'checkbox',
      automationId: checkbox.getAttribute('data-automation-id') ?? autoId,
      ariaLabel: checkbox.getAttribute('aria-label'),
      placeholder: null,
      options: null,
      required: false,
      currentValue: checkbox.checked ? 'true' : 'false',
    }
  }

  // Native select
  const select = container.querySelector<HTMLSelectElement>('select')
  if (select) {
    return {
      label,
      type: 'dropdown',
      automationId: select.getAttribute('data-automation-id') ?? autoId,
      ariaLabel: select.getAttribute('aria-label'),
      placeholder: null,
      options: Array.from(select.options)
        .map((o) => o.text.trim())
        .filter(Boolean),
      required: select.required,
      currentValue: select.value || null,
    }
  }

  // Workday custom multiselect / combobox (div with multiSelectContainer inside)
  const multiSelect = container.querySelector<Element>(
    '[data-automation-id="multiSelectContainer"], [data-automation-id="multiselectInputContainer"]',
  )
  if (multiSelect) {
    return {
      label,
      type: 'dropdown',
      automationId: autoId,
      ariaLabel: null,
      placeholder: null,
      options: null, // options load dynamically on click
      required: container.querySelector('[aria-required="true"]') !== null,
      currentValue: null,
    }
  }

  // Text input
  const input = container.querySelector<HTMLInputElement>(
    'input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"])',
  )
  if (input) {
    const inputType = input.type || 'text'
    const fieldType = inputType === 'date' ? 'date' : 'text'
    return {
      label,
      type: fieldType,
      automationId: input.getAttribute('data-automation-id') ?? autoId,
      ariaLabel: input.getAttribute('aria-label'),
      placeholder: input.placeholder || null,
      options: null,
      required: input.required,
      currentValue: input.value || null,
    }
  }

  // Textarea
  const textarea = container.querySelector<HTMLTextAreaElement>('textarea')
  if (textarea) {
    return {
      label,
      type: 'textarea',
      automationId: textarea.getAttribute('data-automation-id') ?? autoId,
      ariaLabel: textarea.getAttribute('aria-label'),
      placeholder: textarea.placeholder || null,
      options: null,
      required: textarea.required,
      currentValue: textarea.value || null,
    }
  }

  return null
}

export function scanFormFields(): FieldDescriptor[] {
  const results: FieldDescriptor[] = []
  const containers = document.querySelectorAll<Element>(WORKDAY_FIELD_CONTAINER)

  for (const container of containers) {
    const autoId = container.getAttribute('data-automation-id') ?? ''

    // Skip nav/chrome containers
    if (SKIP_AUTOMATION_IDS.has(autoId)) continue

    // Only process visible containers
    if (!isVisible(container)) continue

    const descriptor = getFieldDescriptorFromContainer(container)
    if (descriptor && descriptor.label) {
      results.push(descriptor)
    }
  }

  return results
}
