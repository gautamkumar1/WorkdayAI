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

// Known Workday page-section automation IDs — confirmed from multiple Workday tenants
const PAGE_SECTION_IDS = [
  'contactInformationPage',
  'myExperiencePage',
  'voluntaryDisclosuresPage',
  'selfIdentificationPage',
  'applyFlowMyInfoPage',
  'applyFlowExperiencePage',
  'applyFlowQuestionnairePage',
  'applyFlowVoluntaryPage',
  'applyFlowReviewPage',
]

function getLabelText(container: Element): string {
  // Strategy 1: direct child <label>
  for (const child of Array.from(container.children)) {
    if (child.tagName === 'LABEL') {
      return child.textContent?.replace(/\*/g, '').trim() ?? ''
    }
  }

  // Strategy 2: [data-automation-id$="Label"] — direct text nodes only
  const labelEl =
    container.querySelector<Element>('[data-automation-id$="Label"]') ??
    container.querySelector<Element>('[data-automation-id="formLabel"]')

  if (labelEl) {
    const directText = Array.from(labelEl.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent ?? '')
      .join('')
      .replace(/\*/g, '')
      .trim()
    if (directText) return directText
    return labelEl.textContent?.replace(/\*/g, '').trim() ?? ''
  }

  // Strategy 3: first short child div/span/p with no inputs
  for (const child of Array.from(container.children)) {
    if (
      ['P', 'SPAN', 'DIV'].includes(child.tagName) &&
      !child.querySelector('input,select,textarea')
    ) {
      const text = child.textContent?.replace(/\*/g, '').trim() ?? ''
      if (text.length > 0 && text.length < 200) return text
    }
  }

  // Strategy 4: known Workday automation ID → human label mapping
  const autoId = container.getAttribute('data-automation-id') ?? ''
  const KNOWN_LABELS: Record<string, string> = {
    'formField-source': 'How Did You Hear About Us?',
    'formField-candidateIsPreviousWorker': 'Have you previously worked for this company?',
    'formField-country': 'Country',
    'formField-legalName--firstName': 'First Name',
    'formField-legalName--lastName': 'Last Name',
    'formField-legalName--firstNameLocal': 'Local Given Name(s)',
    'formField-legalName--lastNameLocal': 'Local Family Name',
    'formField-addressLine1': 'Address Line 1',
    'formField-city': 'City',
    'formField-postalCode': 'Postal Code',
    'formField-countryRegion': 'State/Region',
    'formField-phoneType': 'Phone Device Type',
    'formField-countryPhoneCode': 'Country Phone Code',
    'formField-phoneNumber': 'Phone Number',
    'formField-extension': 'Phone Extension',
    'formField-preferredCheck': 'I have a preferred name',
  }
  if (KNOWN_LABELS[autoId]) return KNOWN_LABELS[autoId]!

  return ''
}

function getFieldDescriptorFromContainer(container: Element): FieldDescriptor | null {
  const label = getLabelText(container)
  if (!label) return null

  const autoId = container.getAttribute('data-automation-id') ?? ''

  // Radio group
  const radios = container.querySelectorAll<HTMLInputElement>('input[type="radio"]')
  if (radios.length > 0) {
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

  // Workday custom multiselect
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
      options: null,
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
    return {
      label,
      type: inputType === 'date' ? 'date' : 'text',
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

function findActiveSection(): Element {
  // 1. Try known section IDs
  for (const sectionId of PAGE_SECTION_IDS) {
    const section = document.querySelector(`[data-automation-id="${sectionId}"]`)
    if (section) return section
  }

  // 2. Find the first smartDivider — everything above it is the active section
  const dividers = document.querySelectorAll('[data-automation-id="smartDivider"]')
  if (dividers.length > 0) {
    const firstDivider = dividers[0]!
    // Create a virtual root: collect formField containers before the first divider
    return firstDivider.parentElement ?? document.body
  }

  return document.body
}

export function scanFormFields(): FieldDescriptor[] {
  const results: FieldDescriptor[] = []
  const root = findActiveSection()

  // Get all formField containers within the active section
  const allContainers = Array.from(root.querySelectorAll<Element>(WORKDAY_FIELD_CONTAINER))

  // If smartDividers exist inside root, only take fields before the first one
  // (Workday uses smartDividers to separate logical groups on the same page)
  const firstDivider = root.querySelector('[data-automation-id="smartDivider"]')
  const containers = firstDivider
    ? allContainers.filter((c) => {
        // Keep container if it comes before the first smartDivider in DOM order
        const pos = firstDivider.compareDocumentPosition(c)
        // DOCUMENT_POSITION_PRECEDING = 2
        return !!(pos & Node.DOCUMENT_POSITION_PRECEDING)
      })
    : allContainers

  // Fallback: if filtering leaves nothing, use all containers
  const finalContainers = containers.length > 0 ? containers : allContainers

  for (const container of finalContainers) {
    const autoId = container.getAttribute('data-automation-id') ?? ''
    if (SKIP_AUTOMATION_IDS.has(autoId)) continue

    const style = window.getComputedStyle(container)
    if (style.display === 'none' || style.visibility === 'hidden') continue

    const descriptor = getFieldDescriptorFromContainer(container)
    if (descriptor && descriptor.label) {
      results.push(descriptor)
    }
  }

  return results
}
