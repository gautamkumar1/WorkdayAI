import type { WorkdayStep } from '@workday-ai/shared'
import { detectCurrentStep } from './stepDetector'

function findButtonByText(text: string): HTMLButtonElement | null {
  const buttons = document.querySelectorAll('button')
  for (const btn of buttons) {
    if (btn.textContent?.trim().includes(text)) return btn
  }
  return null
}

function findButtonByAriaLabel(text: string): HTMLButtonElement | null {
  const buttons = document.querySelectorAll<HTMLButtonElement>('button[aria-label]')
  for (const btn of buttons) {
    if (btn.getAttribute('aria-label')?.includes(text)) return btn
  }
  return null
}

function waitForStepChange(previousStep: WorkdayStep, previousUrl: string): Promise<WorkdayStep> {
  return new Promise((resolve) => {
    const maxPolls = 25 // 25 × 200ms = 5s
    let polls = 0

    const interval = setInterval(() => {
      polls++
      const currentUrl = window.location.href
      const currentStep = detectCurrentStep()

      if (currentUrl !== previousUrl || currentStep !== previousStep) {
        clearInterval(interval)
        resolve(currentStep)
        return
      }

      if (polls >= maxPolls) {
        clearInterval(interval)
        resolve(currentStep)
      }
    }, 200)
  })
}

export async function advanceToNextStep(): Promise<{ advanced: boolean; newStep: WorkdayStep }> {
  const currentStep = detectCurrentStep()
  const currentUrl = window.location.href

  let button: Element | null = null

  button = document.querySelector('[data-automation-id="bottom-navigation-next-button"]')

  if (!button && currentStep !== 'review') {
    button = document.querySelector('[data-automation-id="submitButton"]')
  }

  if (!button) {
    button = findButtonByText('Save and Continue')
  }

  if (!button) {
    button = findButtonByText('Next')
  }

  if (!button) {
    button = findButtonByAriaLabel('Next')
  }

  if (!button) {
    return { advanced: false, newStep: currentStep }
  }

  ;(button as HTMLElement).click()

  const newStep = await waitForStepChange(currentStep, currentUrl)
  const advanced = newStep !== currentStep || window.location.href !== currentUrl

  return { advanced, newStep }
}
