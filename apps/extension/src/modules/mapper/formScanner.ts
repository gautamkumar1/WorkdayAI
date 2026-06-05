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
  'applyFlowMyInfoPage',
  'contactInformationPage',
  'myExperiencePage',
  'voluntaryDisclosuresPage',
  'selfIdentificationPage',
  'applyFlowExperiencePage',
  'applyFlowQuestionnairePage',
  'applyFlowVoluntaryPage',
  'applyFlowReviewPage',
  'legalNameSection',
  'addressSection',
  'phoneSection',
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
  // Real Workday automation IDs confirmed from ubangura/Workday-Application-Automator
  // and WeKruit/Hand-X toy fixture. Two naming conventions exist across tenants:
  //   1. underscore:   formField-legalNameSection_firstName  (most common, confirmed)
  //   2. double-dash:  formField-legalName--firstName        (older tenants)
  const KNOWN_LABELS: Record<string, string> = {
    'formField-source': 'How Did You Hear About Us?',
    'formField-referral': 'How Did You Hear About Us?',
    'formField-candidateIsPreviousWorker': 'Have you previously worked for this company?',
    'formField-previousWorker': 'Have you previously worked for this company?',
    'formField-country': 'Country',
    // Legal Name — underscore convention (confirmed real)
    'formField-legalNameSection_firstName': 'Given Name(s)',
    'formField-legalNameSection_lastName': 'Family Name',
    'formField-legalNameSection_firstNameLocal': 'Local Given Name(s)',
    'formField-legalNameSection_lastNameLocal': 'Local Family Name',
    'formField-legalNameSection_preferredName': 'I have a preferred name',
    // Legal Name — double-dash convention (older tenants)
    'formField-legalName--firstName': 'Given Name(s)',
    'formField-legalName--givenName': 'Given Name(s)',
    'formField-legalName--lastName': 'Family Name',
    'formField-legalName--familyName': 'Family Name',
    'formField-legalName--firstNameLocal': 'Local Given Name(s)',
    'formField-legalName--givenNameLocal': 'Local Given Name(s)',
    'formField-legalName--lastNameLocal': 'Local Family Name',
    'formField-legalName--familyNameLocal': 'Local Family Name',
    // Other name variants
    'formField-givenName': 'Given Name(s)',
    'formField-firstName': 'Given Name(s)',
    'formField-familyName': 'Family Name',
    'formField-lastName': 'Family Name',
    // Address — underscore convention (confirmed real)
    'formField-addressSection_addressLine1': 'Address Line 1',
    'formField-addressSection_addressLine2': 'Address Line 2',
    'formField-addressSection_city': 'City',
    'formField-addressSection_postalCode': 'Postal Code',
    'formField-addressSection_countryRegion': 'State',
    // Address — flat convention
    'formField-addressLine1': 'Address Line 1',
    'formField-addressLine2': 'Address Line 2',
    'formField-city': 'City',
    'formField-postalCode': 'Postal Code',
    'formField-countryRegion': 'State',
    'formField-stateProvince': 'State',
    // Phone — confirmed real IDs from ubangura repo
    'formField-phone-device-type': 'Phone Device Type',
    'formField-phone-number': 'Phone Number',
    'formField-phone': 'Phone Number',
    // Phone — alternate conventions
    'formField-phoneType': 'Phone Device Type',
    'formField-countryPhoneCode': 'Country Phone Code',
    'formField-phoneNumber': 'Phone Number',
    'formField-extension': 'Phone Extension',
    'formField-phone-extension': 'Phone Extension',
    // Preferred name checkbox
    'formField-preferredCheck': 'I have a preferred name',
    'formField-usePreferredName': 'I have a preferred name',
    // Email
    'formField-email': 'Email Address',
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

  // Checkbox — real input or Workday's div[role="checkbox"]
  const checkbox = container.querySelector<HTMLInputElement>('input[type="checkbox"]')
  const ariaCheckbox = container.querySelector<HTMLElement>('[role="checkbox"]')
  if (checkbox) {
    return {
      label,
      type: 'checkbox',
      automationId: autoId, // always store container ID so filler can querySelector into it
      ariaLabel: checkbox.getAttribute('aria-label'),
      placeholder: null,
      options: null,
      required: false,
      currentValue: checkbox.checked ? 'true' : 'false',
    }
  }
  if (ariaCheckbox) {
    return {
      label,
      type: 'checkbox',
      automationId: autoId,
      ariaLabel: ariaCheckbox.getAttribute('aria-label'),
      placeholder: null,
      options: null,
      required: false,
      currentValue: ariaCheckbox.getAttribute('aria-checked') === 'true' ? 'true' : 'false',
    }
  }

  // Native select
  const select = container.querySelector<HTMLSelectElement>('select')
  if (select) {
    return {
      label,
      type: 'dropdown',
      automationId: autoId, // always container ID
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

  // Workday button dropdown (aria-haspopup="listbox") — phone-device-type, countryRegion, etc.
  const dropdownBtn = container.querySelector<HTMLElement>('button[aria-haspopup="listbox"]')
  if (dropdownBtn) {
    return {
      label,
      type: 'dropdown',
      automationId: autoId, // always container ID
      ariaLabel: dropdownBtn.getAttribute('aria-label'),
      placeholder: null,
      options: null,
      required: container.querySelector('[aria-required="true"]') !== null,
      currentValue: dropdownBtn.textContent?.trim() || null,
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
      automationId: autoId, // always container ID — filler drills into it
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
      automationId: autoId, // always container ID
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
  const finalContainers = Array.from(root.querySelectorAll<Element>(WORKDAY_FIELD_CONTAINER))

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
