// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fillDropdown } from '../dropdownFiller.js'

describe('fillDropdown — native <select>', () => {
  function makeSelect(options: string[]): HTMLSelectElement {
    const sel = document.createElement('select')
    for (const text of options) {
      const opt = document.createElement('option')
      opt.text = text
      sel.add(opt)
    }
    return sel
  }

  it('selects matching option (case-insensitive)', async () => {
    const sel = makeSelect(['United States', 'Canada', 'Mexico'])
    const changed = await fillDropdown(sel, 'canada')
    expect(changed).toBe(true)
    expect(sel.options[sel.selectedIndex]!.text).toBe('Canada')
  })

  it('dispatches change event on match', async () => {
    const sel = makeSelect(['Yes', 'No'])
    const handler = vi.fn()
    sel.addEventListener('change', handler)
    await fillDropdown(sel, 'Yes')
    expect(handler).toHaveBeenCalledOnce()
  })

  it('returns false when option not found', async () => {
    const sel = makeSelect(['Yes', 'No'])
    const result = await fillDropdown(sel, 'Maybe')
    expect(result).toBe(false)
  })
})

describe('fillDropdown — Workday combobox', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('clicks the element and matches role=option by text', async () => {
    const combobox = document.createElement('div')
    combobox.setAttribute('role', 'combobox')
    const clicked: string[] = []
    combobox.addEventListener('click', () => {
      // Simulate Workday rendering options on click
      const opt = document.createElement('div')
      opt.setAttribute('role', 'option')
      opt.textContent = 'Full-Time'
      document.body.appendChild(opt)
      clicked.push('combobox')
    })
    document.body.appendChild(combobox)

    const result = await fillDropdown(combobox, 'Full-Time')
    expect(result).toBe(true)
    expect(clicked).toContain('combobox')
  })

  it('returns false when no matching role=option exists', async () => {
    const combobox = document.createElement('div')
    combobox.setAttribute('role', 'combobox')
    document.body.appendChild(combobox)

    const result = await fillDropdown(combobox, 'Part-Time')
    expect(result).toBe(false)
  })
})
