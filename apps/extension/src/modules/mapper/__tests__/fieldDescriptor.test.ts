import { describe, it, expect } from 'vitest'
import { normalizeField } from '../fieldDescriptor'

function makeInput(overrides: {
  type?: string
  tagName?: string
  label?: string
  automationId?: string | null
  ariaLabel?: string | null
  placeholder?: string | null
  required?: boolean
  value?: string
}): Parameters<typeof normalizeField>[0] {
  const type = overrides.type ?? 'text'
  const tagName = overrides.tagName ?? 'INPUT'

  const el = {
    tagName,
    getAttribute: (attr: string) => {
      if (attr === 'data-automation-id') return overrides.automationId ?? null
      if (attr === 'aria-label') return overrides.ariaLabel ?? null
      if (attr === 'placeholder') return overrides.placeholder ?? null
      if (attr === 'aria-required') return null
      return null
    },
    hasAttribute: (attr: string) => {
      if (attr === 'required') return overrides.required ?? false
      return false
    },
    type,
    value: overrides.value ?? '',
    options: [],
  } as unknown as HTMLInputElement

  return {
    element: el,
    rawLabel: overrides.label ?? 'Field',
    rawType: type,
  }
}

describe('normalizeField', () => {
  it('strips trailing asterisk from label', () => {
    const result = normalizeField(makeInput({ label: 'First Name *' }))
    expect(result.label).toBe('First Name')
  })

  it('collapses whitespace in label', () => {
    const result = normalizeField(makeInput({ label: '  First   Name  ' }))
    expect(result.label).toBe('First Name')
  })

  it("maps 'text' input type to 'text' FieldType", () => {
    const result = normalizeField(makeInput({ type: 'text' }))
    expect(result.type).toBe('text')
  })

  it("maps 'select-one' to 'dropdown'", () => {
    const el = {
      tagName: 'SELECT',
      getAttribute: () => null,
      hasAttribute: () => false,
      type: 'select-one',
      value: '',
      options: [],
    } as unknown as HTMLSelectElement

    const result = normalizeField({ element: el, rawLabel: 'Country', rawType: 'select-one' })
    expect(result.type).toBe('dropdown')
  })
})
