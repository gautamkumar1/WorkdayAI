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

function getLabelText(container: Element): string {
  // Strategy 1: direct child label element
  for (const child of Array.from(container.children)) {
    if (child.tagName === 'LABEL') {
      return child.textContent?.replace(/\*/g, '').trim() ?? ''
    }
  }

  // Strategy 2: [data-automation-id$="Label"] — but only take its own text, not descendants
  const labelEl =
    container.querySelector<Element>('[data-automation-id$="Label"]') ??
    container.querySelector<Element>('[data-automation-id="formLabel"]')

  if (labelEl) {
    // Get only direct text nodes to avoid picking up nested element text
    const directText = Array.from(labelEl.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent ?? '')
      .join('')
      .replace(/\*/g, '')
      .trim()
    if (directText) return directText
    // Fall back to full text if no direct text nodes
    return labelEl.textContent?.replace(/\*/g, '').trim() ?? ''
  }

  // Strategy 3: first <p> or <span> child that looks like a label (short text, no inputs inside)
  for (const child of Array.from(container.children)) {
    if (
      ['P', 'SPAN', 'DIV'].includes(child.tagName) &&
      !child.querySelector('input,select,textarea')
    ) {
      const text = child.textContent?.replace(/\*/g, '').trim() ?? ''
      if (text.length > 0 && text.length < 100) return text
    }
  }

  // Strategy 4: derive from automation ID
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

// Known Workday page-section automation IDs — scan only the active one
const PAGE_SECTION_IDS = [
  'applyFlowMyInfoPage',
  'applyFlowExperiencePage',
  'applyFlowEducationPage',
  'applyFlowQuestionnairePage',
  'applyFlowVoluntaryPage',
  'applyFlowReviewPage',
]

export function scanFormFields(): FieldDescriptor[] {
  const results: FieldDescriptor[] = []

  // Try to find the active page section and scope the scan to it
  let root: Element = document.body
  for (const sectionId of PAGE_SECTION_IDS) {
    const section = document.querySelector(`[data-automation-id="${sectionId}"]`)
    if (section) {
      root = section
      break
    }
  }

  const containers = root.querySelectorAll<Element>(WORKDAY_FIELD_CONTAINER)

  for (const container of containers) {
    const autoId = container.getAttribute('data-automation-id') ?? ''
    if (SKIP_AUTOMATION_IDS.has(autoId)) continue

    // Skip containers that are explicitly hidden via CSS
    const style = window.getComputedStyle(container)
    if (style.display === 'none' || style.visibility === 'hidden') continue

    const descriptor = getFieldDescriptorFromContainer(container)
    if (descriptor && descriptor.label) {
      results.push(descriptor)
    }
  }

  return results
}
