import type { FieldDescriptor, FieldType } from '@workday-ai/shared'

export interface RawFieldData {
  element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  rawLabel: string
  rawType: string
}

function toFieldType(rawType: string, tagName: string): FieldType {
  if (tagName === 'TEXTAREA') return 'textarea'
  if (tagName === 'SELECT' || rawType === 'select-one' || rawType === 'select-multiple') return 'dropdown'
  switch (rawType) {
    case 'date':
    case 'datetime-local':
      return 'date'
    case 'radio':
      return 'radio'
    case 'checkbox':
      return 'checkbox'
    case 'file':
      return 'file'
    default:
      return 'text'
  }
}

function normalizeLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').replace(/\s*\*+\s*$/, '')
}

export function normalizeField(raw: RawFieldData): FieldDescriptor {
  const { element, rawLabel, rawType } = raw
  const tagName = element.tagName

  const automationId = element.getAttribute('data-automation-id')
  const ariaLabel = element.getAttribute('aria-label')
  const placeholder = element.getAttribute('placeholder')
  const required = element.hasAttribute('required') || element.getAttribute('aria-required') === 'true'
  const currentValue = (element as HTMLInputElement).value || null

  let options: string[] | null = null
  if (tagName === 'SELECT') {
    const select = element as HTMLSelectElement
    options = Array.from(select.options)
      .map((o) => o.text.trim())
      .filter(Boolean)
  }

  return {
    label: normalizeLabel(rawLabel),
    type: toFieldType(rawType, tagName),
    automationId,
    ariaLabel,
    placeholder,
    options,
    required,
    currentValue: currentValue === '' ? null : currentValue,
  }
}
