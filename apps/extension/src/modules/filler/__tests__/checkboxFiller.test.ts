// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { fillCheckbox } from '../checkboxFiller.js'

describe('fillCheckbox', () => {
  it('clicks when unchecked and target is true', async () => {
    const el = document.createElement('input')
    el.type = 'checkbox'
    let clicked = false
    el.addEventListener('click', () => { clicked = true })
    await fillCheckbox(el, true)
    expect(clicked).toBe(true)
  })

  it('does not click when already in correct state', async () => {
    const el = document.createElement('input')
    el.type = 'checkbox'
    el.checked = true
    let clicked = false
    el.addEventListener('click', () => { clicked = true })
    await fillCheckbox(el, true)
    expect(clicked).toBe(false)
  })

  it('clicks when checked and target is false', async () => {
    const el = document.createElement('input')
    el.type = 'checkbox'
    el.checked = true
    let clicked = false
    el.addEventListener('click', () => { clicked = true })
    await fillCheckbox(el, false)
    expect(clicked).toBe(true)
  })

  it('always dispatches change event', async () => {
    const el = document.createElement('input')
    el.type = 'checkbox'
    el.checked = true
    const handler = vi.fn()
    el.addEventListener('change', handler)
    await fillCheckbox(el, true) // no state change, but change still fires
    expect(handler).toHaveBeenCalledOnce()
  })
})
