// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../stepDetector', () => ({
  detectCurrentStep: vi.fn().mockReturnValue('my_information'),
}))

import { advanceToNextStep } from '../stepAdvancer'
import { detectCurrentStep } from '../stepDetector'

const mockDetectStep = detectCurrentStep as ReturnType<typeof vi.fn>

function setHref(url: string) {
  Object.defineProperty(window, 'location', {
    value: { href: url },
    writable: true,
    configurable: true,
  })
}

beforeEach(() => {
  document.body.innerHTML = ''
  mockDetectStep.mockReturnValue('my_information')
  setHref('https://wd5.myworkdayjobs.com/apply/step1')
  vi.useFakeTimers()
})

describe('advanceToNextStep', () => {
  it('returns advanced=false when no nav button found', async () => {
    const promise = advanceToNextStep()
    vi.runAllTimers()
    const result = await promise
    expect(result.advanced).toBe(false)
    expect(result.newStep).toBe('my_information')
  })

  it('clicks data-automation-id next button', async () => {
    const btn = document.createElement('button')
    btn.setAttribute('data-automation-id', 'bottom-navigation-next-button')
    let clicked = false
    btn.addEventListener('click', () => { clicked = true })
    document.body.appendChild(btn)

    const promise = advanceToNextStep()
    vi.runAllTimers()
    await promise
    expect(clicked).toBe(true)
  })

  it('falls back to "Save and Continue" button text', async () => {
    const btn = document.createElement('button')
    btn.textContent = 'Save and Continue'
    let clicked = false
    btn.addEventListener('click', () => { clicked = true })
    document.body.appendChild(btn)

    const promise = advanceToNextStep()
    vi.runAllTimers()
    await promise
    expect(clicked).toBe(true)
  })

  it('falls back to "Next" button text', async () => {
    const btn = document.createElement('button')
    btn.textContent = 'Next'
    let clicked = false
    btn.addEventListener('click', () => { clicked = true })
    document.body.appendChild(btn)

    const promise = advanceToNextStep()
    vi.runAllTimers()
    await promise
    expect(clicked).toBe(true)
  })

  it('reports advanced=true when step changes after click', async () => {
    const btn = document.createElement('button')
    btn.setAttribute('data-automation-id', 'bottom-navigation-next-button')
    btn.addEventListener('click', () => {
      mockDetectStep.mockReturnValue('experience')
    })
    document.body.appendChild(btn)

    const promise = advanceToNextStep()
    vi.runAllTimers()
    const result = await promise
    expect(result.advanced).toBe(true)
    expect(result.newStep).toBe('experience')
  })
})
