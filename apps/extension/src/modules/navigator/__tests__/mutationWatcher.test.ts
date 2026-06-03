// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { watchForNewFields } from '../mutationWatcher'

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>'
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// Helper: trigger the MutationObserver by invoking its callback directly
function triggerObserver() {
  // jsdom fires MutationObserver callbacks async — we flush via Promise microtask
  return new Promise<void>((resolve) => {
    document.body.appendChild(document.createElement('span'))
    // Let the microtask queue drain so MutationObserver fires
    Promise.resolve().then(resolve)
  })
}

describe('watchForNewFields', () => {
  it('calls callback after DOM mutation with 300ms debounce', async () => {
    const callback = vi.fn()
    watchForNewFields(callback)

    await triggerObserver()
    expect(callback).not.toHaveBeenCalled()

    vi.advanceTimersByTime(300)
    expect(callback).toHaveBeenCalledOnce()
  })

  it('debounces multiple rapid mutations into one callback', async () => {
    const callback = vi.fn()
    watchForNewFields(callback)

    await triggerObserver()
    vi.advanceTimersByTime(100)
    await triggerObserver()
    vi.advanceTimersByTime(100)
    await triggerObserver()
    vi.advanceTimersByTime(300)

    expect(callback).toHaveBeenCalledOnce()
  })

  it('stops calling callback after cleanup is invoked', async () => {
    const callback = vi.fn()
    const cleanup = watchForNewFields(callback)

    cleanup()
    await triggerObserver()
    vi.advanceTimersByTime(300)

    expect(callback).not.toHaveBeenCalled()
  })
})
