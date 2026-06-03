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

export async function advanceToNextStep(): Promise<boolean> {
  const currentStep = detectCurrentStep()

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

  if (!button) return false

  ;(button as HTMLElement).click()

  await new Promise((resolve) => setTimeout(resolve, 500))

  return true
}
