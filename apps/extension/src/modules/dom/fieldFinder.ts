export function findFieldByAutomationId(id: string): Element | null {
  return (
    document.querySelector(`[data-automation-id="${id}"]`) ??
    document.querySelector(`[data-automation-id*="${id}"]`)
  )
}

export function findFieldByAriaLabel(label: string): Element | null {
  const lower = label.toLowerCase()
  const all = document.querySelectorAll<Element>('[aria-label]')
  for (const el of all) {
    if (el.getAttribute('aria-label')?.toLowerCase() === lower) return el
  }
  return null
}

export function findFieldByPlaceholder(placeholder: string): Element | null {
  return document.querySelector(
    `input[placeholder="${placeholder}"], textarea[placeholder="${placeholder}"]`,
  )
}

function normalizeLabel(text: string): string {
  return text.toLowerCase().replace(/\*$/, '').trim().replace(/\s+/g, '-')
}

function stripAsterisk(text: string): string {
  return text.replace(/\*$/, '').trim()
}

export function findFieldByLabel(labelText: string): Element | null {
  const lower = labelText.toLowerCase()
  const normalizedLower = lower.replace(/\*$/, '').trim()

  // 1. <label> elements with matching text
  const labels = document.querySelectorAll<HTMLLabelElement>('label')
  for (const label of labels) {
    const text = stripAsterisk(label.textContent ?? '').toLowerCase()
    if (text === normalizedLower) {
      if (label.htmlFor) {
        const target = document.getElementById(label.htmlFor)
        if (target) return target
      }
      const nested = label.querySelector('input, select, textarea')
      if (nested) return nested
    }
  }

  // 2. aria-label attribute (case-insensitive)
  const byAria = findFieldByAriaLabel(labelText)
  if (byAria) return byAria

  // 3. Workday label divs: [data-automation-id$="Label"] containing the text,
  //    then look for a sibling or nearby input
  const labelDivs = document.querySelectorAll<Element>('[data-automation-id$="Label"]')
  for (const div of labelDivs) {
    const text = stripAsterisk(div.textContent ?? '').toLowerCase()
    if (text === normalizedLower) {
      // try next sibling input
      const parent = div.parentElement
      if (parent) {
        const field = parent.querySelector('input, select, textarea')
        if (field) return field
      }
    }
  }

  // 4. [data-automation-id] where the ID contains the normalized label
  const normalized = normalizeLabel(labelText)
  const byId = document.querySelector(`[data-automation-id*="${normalized}"]`)
  if (byId) return byId

  return null
}
