export async function fillRadio(groupName: string, value: string): Promise<boolean> {
  const lower = value.toLowerCase()

  // Find by name attribute
  const byName = document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${groupName}"]`)
  for (const radio of byName) {
    const label = radio.labels?.[0]?.textContent?.trim().toLowerCase()
    const ariaLabel = radio.getAttribute('aria-label')?.toLowerCase()
    if (label === lower || ariaLabel === lower) {
      radio.click()
      return true
    }
  }

  // Fallback: data-automation-id containing groupName
  const byAutomation = document.querySelectorAll<HTMLInputElement>(
    `input[type="radio"][data-automation-id*="${groupName}"]`,
  )
  for (const radio of byAutomation) {
    const ariaLabel = radio.getAttribute('aria-label')?.toLowerCase()
    if (ariaLabel === lower) {
      radio.click()
      return true
    }
  }

  return false
}
