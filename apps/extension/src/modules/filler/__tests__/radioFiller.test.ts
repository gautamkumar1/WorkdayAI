// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { fillRadio } from '../radioFiller.js'

function makeRadioGroup(name: string, labels: string[]): HTMLInputElement[] {
  const radios: HTMLInputElement[] = []
  for (const labelText of labels) {
    const input = document.createElement('input')
    input.type = 'radio'
    input.name = name
    const label = document.createElement('label')
    label.textContent = labelText
    label.appendChild(input)
    document.body.appendChild(label)
    radios.push(input)
  }
  return radios
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('fillRadio', () => {
  it('selects radio by label text (case-insensitive)', async () => {
    const [yes] = makeRadioGroup('authorized', ['Yes', 'No'])
    const result = await fillRadio('authorized', 'yes')
    expect(result).toBe(true)
    expect(yes!.checked).toBe(true)
  })

  it('selects radio by aria-label', async () => {
    const input = document.createElement('input')
    input.type = 'radio'
    input.name = 'relocate'
    input.setAttribute('aria-label', 'Willing to Relocate')
    document.body.appendChild(input)

    const result = await fillRadio('relocate', 'willing to relocate')
    expect(result).toBe(true)
  })

  it('returns false when no matching label exists', async () => {
    makeRadioGroup('visaStatus', ['H1B', 'Green Card'])
    const result = await fillRadio('visaStatus', 'Citizen')
    expect(result).toBe(false)
  })

  it('falls back to data-automation-id match', async () => {
    const input = document.createElement('input')
    input.type = 'radio'
    input.setAttribute('data-automation-id', 'workAuth-yes')
    input.setAttribute('aria-label', 'Yes')
    document.body.appendChild(input)

    const result = await fillRadio('workAuth', 'yes')
    expect(result).toBe(true)
  })
})
