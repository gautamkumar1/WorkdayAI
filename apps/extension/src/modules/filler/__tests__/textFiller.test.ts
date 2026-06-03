// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { fillTextField } from '../textFiller.js'

describe('fillTextField', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!

  afterEach(() => {
    // Restore original descriptor
    Object.defineProperty(HTMLInputElement.prototype, 'value', originalDescriptor)
  })

  it('sets value via native setter', async () => {
    const nativeSetter = vi.fn()
    Object.defineProperty(HTMLInputElement.prototype, 'value', {
      ...(originalDescriptor.get !== undefined ? { get: originalDescriptor.get } : {}),
      set: nativeSetter,
      configurable: true,
    })

    const el = document.createElement('input')
    await fillTextField(el, 'hello')
    expect(nativeSetter).toHaveBeenCalledWith('hello')
  })

  it('dispatches input event', async () => {
    const el = document.createElement('input')
    const handler = vi.fn()
    el.addEventListener('input', handler)
    await fillTextField(el, 'test')
    expect(handler).toHaveBeenCalledOnce()
  })

  it('dispatches change event', async () => {
    const el = document.createElement('input')
    const handler = vi.fn()
    el.addEventListener('change', handler)
    await fillTextField(el, 'test')
    expect(handler).toHaveBeenCalledOnce()
  })

  it('dispatches blur event', async () => {
    const el = document.createElement('input')
    const handler = vi.fn()
    el.addEventListener('blur', handler)
    await fillTextField(el, 'test')
    expect(handler).toHaveBeenCalledOnce()
  })
})
