function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForOptions(timeoutMs = 2000): Promise<NodeListOf<HTMLElement>> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const options = document.querySelectorAll<HTMLElement>('[role="option"]')
    if (options.length > 0) return options
    await wait(100)
  }
  return document.querySelectorAll<HTMLElement>('[role="option"]')
}

export async function fillDropdown(element: HTMLElement, value: string): Promise<boolean> {
  // Native <select>
  if (element instanceof HTMLSelectElement) {
    const lower = value.toLowerCase()
    for (let i = 0; i < element.options.length; i++) {
      if (element.options[i]!.text.toLowerCase() === lower) {
        element.selectedIndex = i
        element.dispatchEvent(new Event('change', { bubbles: true }))
        return true
      }
    }
    // partial match fallback
    for (let i = 0; i < element.options.length; i++) {
      if (element.options[i]!.text.toLowerCase().includes(lower)) {
        element.selectedIndex = i
        element.dispatchEvent(new Event('change', { bubbles: true }))
        return true
      }
    }
    return false
  }

  // Workday custom combobox — click to open, wait for options to render
  element.click()
  await wait(300)

  const lower = value.toLowerCase()
  const options = await waitForOptions(2000)

  // Exact match first
  for (const option of options) {
    if (option.textContent?.trim().toLowerCase() === lower) {
      option.click()
      return true
    }
  }

  // Partial match fallback
  for (const option of options) {
    if (option.textContent?.trim().toLowerCase().includes(lower)) {
      option.click()
      return true
    }
  }

  // Close the dropdown if no match by pressing Escape
  element.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  return false
}
