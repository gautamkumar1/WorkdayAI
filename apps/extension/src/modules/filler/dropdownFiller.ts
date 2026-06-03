function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function fillDropdown(element: HTMLElement, value: string): Promise<boolean> {
  if (element instanceof HTMLSelectElement) {
    const lower = value.toLowerCase()
    for (let i = 0; i < element.options.length; i++) {
      if (element.options[i]!.text.toLowerCase() === lower) {
        element.selectedIndex = i
        element.dispatchEvent(new Event('change', { bubbles: true }))
        return true
      }
    }
    return false
  }

  // Workday combobox
  element.click()
  await wait(200)

  const lower = value.toLowerCase()
  const options = document.querySelectorAll<HTMLElement>('[role="option"]')
  for (const option of options) {
    if (option.textContent?.trim().toLowerCase() === lower) {
      option.click()
      return true
    }
  }

  return false
}
