import { fillTextField } from '../filler/textFiller'

export interface FillAttempt {
  element: Element
  value: string
  fieldLabel: string
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getInputValue(element: Element): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.value
  }
  return ''
}

async function tryStrategy1(element: Element, value: string): Promise<boolean> {
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
    return false
  }
  try {
    await fillTextField(element, value)
    await delay(100)
    return getInputValue(element) === value
  } catch {
    return false
  }
}

async function tryStrategy2(element: Element, value: string): Promise<boolean> {
  if (!(element instanceof HTMLElement)) return false
  try {
    element.focus()
    element.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true }))
    element.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', ctrlKey: true, bubbles: true }))

    for (const char of value) {
      const code = char.charCodeAt(0)
      element.dispatchEvent(
        new KeyboardEvent('keydown', { key: char, charCode: code, bubbles: true }),
      )
      element.dispatchEvent(
        new KeyboardEvent('keypress', { key: char, charCode: code, bubbles: true }),
      )
      element.dispatchEvent(
        new KeyboardEvent('keyup', { key: char, charCode: code, bubbles: true }),
      )
    }

    await delay(100)
    return getInputValue(element) === value
  } catch {
    return false
  }
}

async function tryStrategy3(element: Element, value: string): Promise<boolean> {
  if (!(element instanceof HTMLElement)) return false
  try {
    element.focus()
    const result = document.execCommand('selectAll', false)
    if (!result) {
      // execCommand not available — skip
    }
    document.execCommand('insertText', false, value)
    await delay(100)
    return getInputValue(element) === value
  } catch {
    return false
  }
}

export async function fillWithFallback(attempt: FillAttempt): Promise<'success' | 'failed'> {
  const { element, value } = attempt

  if (await tryStrategy1(element, value)) return 'success'
  if (await tryStrategy2(element, value)) return 'success'
  if (await tryStrategy3(element, value)) return 'success'

  return 'failed'
}
