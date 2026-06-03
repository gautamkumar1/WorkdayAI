// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock detectCurrentStep before importing loginWatcher
vi.mock('../stepDetector', () => ({
  detectCurrentStep: vi.fn(),
}))

import { isOnLoginStep, waitForLoginCompletion } from '../loginWatcher'
import { detectCurrentStep } from '../stepDetector'

const mockDetect = vi.mocked(detectCurrentStep)

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('isOnLoginStep', () => {
  it('returns true when detectCurrentStep returns login', () => {
    mockDetect.mockReturnValue('login')
    expect(isOnLoginStep()).toBe(true)
  })

  it('returns false when detectCurrentStep returns my_information', () => {
    mockDetect.mockReturnValue('my_information')
    expect(isOnLoginStep()).toBe(false)
  })

  it('returns false when detectCurrentStep returns unknown', () => {
    mockDetect.mockReturnValue('unknown')
    expect(isOnLoginStep()).toBe(false)
  })
})

describe('waitForLoginCompletion', () => {
  it('resolves when step changes from login to my_information', async () => {
    mockDetect
      .mockReturnValueOnce('login')
      .mockReturnValueOnce('login')
      .mockReturnValueOnce('my_information')

    const promise = waitForLoginCompletion()

    // Advance timers: 2 ticks still login, 3rd tick resolves
    await vi.advanceTimersByTimeAsync(3000)

    await expect(promise).resolves.toBeUndefined()
  })

  it('rejects after 300 polls (5 minutes)', async () => {
    mockDetect.mockReturnValue('login')

    // Attach rejection handler immediately to avoid unhandled rejection
    let caughtError: Error | null = null
    const promise = waitForLoginCompletion().catch((err: unknown) => {
      caughtError = err instanceof Error ? err : new Error(String(err))
    })

    // 300 polls × 1000ms = 300s
    await vi.advanceTimersByTimeAsync(300_000)
    await promise

    expect(caughtError).not.toBeNull()
    expect((caughtError as Error | null)?.message).toBe('Login timeout')
  })
})
