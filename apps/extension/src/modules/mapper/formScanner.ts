import type { FieldDescriptor } from '@workday-ai/shared'
import { normalizeField } from './fieldDescriptor'

type FormElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

const FIELD_SELECTOR = [
  '[data-automation-id]',
  '[aria-label]',
  'input[placeholder]',
  'textarea[placeholder]',
  'input',
  'select',
  'textarea',
].join(', ')

function isVisible(el: Element): boolean {
  const style = window.getComputedStyle(el)
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
}

function isSkipped(el: FormElement): boolean {
  if (el.hasAttribute('disabled')) return true
  if (el.getAttribute('type') === 'hidden') return true
  if (el.hasAttribute('data-wai-filled')) return true
  if (!isVisible(el)) return true
  return false
}

function findLabel(el: FormElement, root: Document | ShadowRoot): string {
  // aria-labelledby
  const labelledBy = el.getAttribute('aria-labelledby')
  if (labelledBy) {
    const labelEl = root.getElementById(labelledBy)
    if (labelEl) return labelEl.textContent ?? ''
  }

  // for attribute on label
  if (el.id) {
    const escapedId = typeof CSS !== 'undefined' ? CSS.escape(el.id) : el.id
    const forLabel = root.querySelector<HTMLLabelElement>(`label[for="${escapedId}"]`)
    if (forLabel) return forLabel.textContent ?? ''
  }

  // closest label parent
  const parentLabel = el.closest('label')
  if (parentLabel) return parentLabel.textContent ?? ''

  // aria-label attribute (fallback)
  const ariaLabel = el.getAttribute('aria-label')
  if (ariaLabel) return ariaLabel

  // preceding sibling label text
  let sibling = el.previousElementSibling
  while (sibling) {
    if (sibling.tagName === 'LABEL') return sibling.textContent ?? ''
    sibling = sibling.previousElementSibling
  }

  return ''
}

function extractOptions(el: FormElement): string[] | null {
  if (el.tagName !== 'SELECT') return null
  return Array.from((el as HTMLSelectElement).options)
    .map((o) => o.text.trim())
    .filter(Boolean)
}

function getRawType(el: FormElement): string {
  if (el.tagName === 'SELECT') return 'select-one'
  if (el.tagName === 'TEXTAREA') return 'textarea'
  return (el as HTMLInputElement).type ?? 'text'
}

function scanRoot(root: Document | ShadowRoot): FieldDescriptor[] {
  const results: FieldDescriptor[] = []
  const seen = new Set<Element>()

  const elements = root.querySelectorAll<FormElement>(FIELD_SELECTOR)

  for (const el of elements) {
    if (seen.has(el)) continue
    seen.add(el)

    if (isSkipped(el)) continue

    const rawLabel = findLabel(el, root)
    const rawType = getRawType(el)
    const descriptor = normalizeField({ element: el, rawLabel, rawType })

    // override options for select/combobox
    const options = extractOptions(el)
    if (options !== null) {
      ;(descriptor as { options: string[] | null }).options = options
    }

    results.push(descriptor)

    // traverse shadow DOM
    if (el.shadowRoot) {
      results.push(...scanRoot(el.shadowRoot))
    }
  }

  return results
}

export function scanFormFields(): FieldDescriptor[] {
  return scanRoot(document)
}
